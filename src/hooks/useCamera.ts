import { useCallback, useRef, useState } from 'react'
import { VIDEO_MIN_S, VIDEO_MAX_S } from '@/constants'

export type CameraFacing = 'front' | 'back'
export type RecordingState = 'idle' | 'previewing' | 'recording' | 'done' | 'error'

interface UseCameraReturn {
  state: RecordingState
  previewRef: React.RefObject<HTMLVideoElement | null>
  recordedBlob: Blob | null
  recordedUrl: string | null
  /** 0 ~ VIDEO_MAX_S (녹화 진행 초) */
  recordingElapsed: number
  /** 최소 녹화 시간(3s) 충족 여부 */
  canStop: boolean
  error: string | null
  /** raw 스트림 width > height → 가로 녹화 → Lambda transpose 필요 */
  isHorizontal: boolean
  /** 현재 사용 중인 카메라 — "user"(전면) | "environment"(후면) */
  facingMode: 'user' | 'environment'
  /** 스트림이 실제로 보고한 facingMode. 노트북 등 미보고 시 undefined — 리뷰 회전 분기용 */
  rawFacingMode: 'user' | 'environment' | undefined
  /** 녹화 파일에 90° 회전이 구워졌는지 (세로 스트림 → 가로 파일). 리뷰 카운터 회전용 */
  recordedRotated: boolean

  startPreview: (facing?: CameraFacing) => Promise<void>
  stopPreview: () => void
  startRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
}

export function useCamera(): UseCameraReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isHorizontal, setIsHorizontal] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [rawFacingMode, setRawFacingMode] = useState<'user' | 'environment' | undefined>(undefined)
  const [recordedRotated, setRecordedRotated] = useState(false)

  const previewRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordStartRef = useRef<number>(0)
  const facingRef = useRef<'user' | 'environment'>('user')
  const rafRef = useRef<number>(0)

  // ── Web: camera preview ───────────────────────────────────────────────────

  const startPreview = useCallback(async (facing: CameraFacing = 'front') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing === 'front' ? 'user' : 'environment' },
        audio: true,
      })
      streamRef.current = stream

      // raw 스트림 해상도로 가로 녹화 여부 판단 (width > height → 가로)
      const settings = stream.getVideoTracks()[0]?.getSettings()
      setIsHorizontal((settings?.width ?? 0) > (settings?.height ?? 0))
      // 실제 스트림의 facingMode 우선, 없으면 요청한 facing 사용
      const actualFacing = settings?.facingMode
      const rawFm = actualFacing === 'environment' ? 'environment' : actualFacing === 'user' ? 'user' : undefined
      setRawFacingMode(rawFm)
      const resolvedFacing = rawFm ?? (facing === 'back' ? 'environment' : 'user')
      setFacingMode(resolvedFacing)
      facingRef.current = resolvedFacing

      if (previewRef.current) {
        previewRef.current.srcObject = stream
        previewRef.current.muted = true
        await previewRef.current.play()
      }

      setState('previewing')
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera unavailable'
      setError(msg)
      setState('error')
    }
  }, [])

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (previewRef.current) previewRef.current.srcObject = null
    setState((prev) => (prev === 'previewing' ? 'idle' : prev))
  }, [])

  // ── Web: recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    const video = previewRef.current
    if (!stream || !video) return

    chunksRef.current = []
    setRecordingElapsed(0)
    recordStartRef.current = Date.now()

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'

    // ── WYSIWYG 굽기: 화면에 보이는 그대로(회전+미러) 캔버스에 그려서 녹화 ──
    // 카메라 페이지는 CSS로 page 전체를 rotate(90deg) 하지만 스트림 픽셀은 안 돌아가므로,
    // 세로 픽셀 스트림(vw<vh)은 캔버스에서 90° CW 회전해 굽는다.
    // 전면 카메라는 프리뷰 미러(scaleX(-1))와 동일하게 좌우반전도 굽는다.
    // → 녹화 파일 = 사용자가 본 화면. 리뷰/콜라주에서 회전·미러 보정 불필요.
    const vw = video.videoWidth
    const vh = video.videoHeight
    const needsRotate = vw < vh
    const needsMirror = facingRef.current === 'user'

    let recordStream: MediaStream = stream
    const canBake = vw > 0 && vh > 0
      && typeof HTMLCanvasElement.prototype.captureStream === 'function'
      && (needsRotate || needsMirror)
    setRecordedRotated(canBake && needsRotate)

    if (canBake) {
      const canvas = document.createElement('canvas')
      canvas.width = needsRotate ? vh : vw
      canvas.height = needsRotate ? vw : vh
      const ctx = canvas.getContext('2d')!

      const drawFrame = () => {
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        if (needsRotate) ctx.rotate(Math.PI / 2)   // CSS rotate(90deg)와 동일 방향
        if (needsMirror) ctx.scale(-1, 1)          // CSS scaleX(-1)와 동일
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh)
        ctx.restore()
        rafRef.current = requestAnimationFrame(drawFrame)
      }
      drawFrame()

      recordStream = canvas.captureStream(30)
      stream.getAudioTracks().forEach((t) => recordStream.addTrack(t))
    }

    const recorder = new MediaRecorder(recordStream, { mimeType })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      clearInterval(elapsedIntervalRef.current!)
      cancelAnimationFrame(rafRef.current)
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setRecordedBlob(blob)
      setRecordedUrl(URL.createObjectURL(blob))
      setState('done')
    }

    recorder.start(100)
    recorderRef.current = recorder
    setState('recording')

    // 진행 초 업데이트
    elapsedIntervalRef.current = setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - recordStartRef.current) / 1000))
    }, 100)

    // VIDEO_MAX_S 에 자동 종료
    setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }, VIDEO_MAX_S * 1000)
  }, [])

  const stopRecording = useCallback(() => {
    const elapsed = (Date.now() - recordStartRef.current) / 1000
    if (elapsed < VIDEO_MIN_S) return // 최소 3초 미만이면 무시
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  // ── Clear ─────────────────────────────────────────────────────────────────

  const clearRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingElapsed(0)
    setState(streamRef.current ? 'previewing' : 'idle')
  }, [recordedUrl])

  const elapsed = recordingElapsed
  const canStop = elapsed >= VIDEO_MIN_S

  return {
    state,
    previewRef,
    recordedBlob,
    recordedUrl,
    recordingElapsed: elapsed,
    canStop,
    error,
    isHorizontal,
    facingMode,
    rawFacingMode,
    recordedRotated,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    clearRecording,
  }
}

export { VIDEO_MIN_S, VIDEO_MAX_S }
