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

  const previewRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordStartRef = useRef<number>(0)

  // ── Web: camera preview ───────────────────────────────────────────────────

  const startPreview = useCallback(async (facing: CameraFacing = 'front') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing === 'front' ? 'user' : 'environment' },
        audio: true,
      })
      streamRef.current = stream

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
    if (!stream) return

    chunksRef.current = []
    setRecordingElapsed(0)
    recordStartRef.current = Date.now()

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    const recorder = new MediaRecorder(stream, { mimeType })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      clearInterval(elapsedIntervalRef.current!)
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
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    clearRecording,
  }
}

export { VIDEO_MIN_S, VIDEO_MAX_S }
