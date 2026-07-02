import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCamera, VIDEO_MIN_S, VIDEO_MAX_S, type CameraFacing } from '@/hooks/useCamera'
import { useMissionStore } from '@/store/missionStore'
import { missionApi, uploadApi } from '@/services/api/endpoints'
import MissionInfoBar from '@/components/mission/MissionInfoBar'
import CameraControls from '@/components/mission/CameraControls'
import { ROUTES } from '@/constants'
import { formatTime } from '@/hooks/useTimer'
import styles from './MissionCameraPage.module.css'

export default function MissionCameraPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const active          = useMissionStore((s) => s.active)
  const setRecordedBlob = useMissionStore((s) => s.setRecordedBlob)
  const clearMission    = useMissionStore((s) => s.clearMission)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const camera = useCamera()
  const previewVideoRef = camera.previewRef as React.RefObject<HTMLVideoElement>
  // 녹화된 영상 미리보기용 별도 video ref
  const reviewRef = useRef<HTMLVideoElement | null>(null)
  const videoWrapRef = useRef<HTMLDivElement | null>(null)
  // 파일에 90° 회전이 구워진 경우, 회전된 페이지 안에서는 -90° 카운터 회전해서 표시
  const [reviewStyle, setReviewStyle] = useState<React.CSSProperties | undefined>(undefined)
  const [facing, setFacing] = useState<CameraFacing>('front')
  const [hasMultiCam, setHasMultiCam] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(active?.seconds_left ?? 0)

  // 카메라 페이지 마운트 시 global portrait lock 예외 처리
  useEffect(() => {
    document.documentElement.dataset.camera = 'true'
    return () => { delete document.documentElement.dataset.camera }
  }, [])

  // 뷰포트가 실제 세로일 때만 CSS 90° 회전 적용.
  // iOS Safari 등 자동회전 환경에서는 폰을 눕히면 브라우저 자체가 가로로 회전하므로
  // CSS 회전까지 더하면 180° 이중 회전이 됨 → 뷰포트 방향을 보고 분기
  const [viewportPortrait, setViewportPortrait] = useState(
    window.innerHeight >= window.innerWidth
  )
  useEffect(() => {
    const onResize = () => setViewportPortrait(window.innerHeight >= window.innerWidth)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // 페이지 진입 시 카메라 켜기
  useEffect(() => {
    camera.startPreview('front').then(() => {
      navigator.mediaDevices?.enumerateDevices?.()
        .then((devices) => {
          const cams = devices.filter((d) => d.kind === 'videoinput')
          setHasMultiCam(cams.length > 1)
        })
        .catch(() => setHasMultiCam(false))
    })
    return () => {
      camera.stopPreview()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFlipCamera() {
    if (camera.state !== 'previewing') return
    const next: CameraFacing = facing === 'front' ? 'back' : 'front'
    setFacing(next)
    setTorchOn(false)
    camera.stopPreview()
    await camera.startPreview(next)
  }

  // 플래시(torch) 토글 — 지원 기기(주로 후면)에서만 동작, 미지원 시 무시
  async function toggleTorch() {
    const stream = previewVideoRef.current?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks?.()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn((v) => !v)
    } catch {
      /* 미지원 기기 */
    }
  }

  // 녹화 완료되면 미리보기 재생
  useEffect(() => {
    if (camera.state === 'done' && camera.recordedUrl && reviewRef.current) {
      reviewRef.current.src = camera.recordedUrl
      reviewRef.current.loop = true
      reviewRef.current.play()

      // 회전이 구워진 파일: 회전된 페이지 안에서 그대로 틀면 이중 회전되므로 -90° 보정
      const wrap = videoWrapRef.current
      if (camera.recordedRotated && wrap) {
        setReviewStyle({
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: wrap.offsetHeight,
          height: wrap.offsetWidth,
          transform: 'translate(-50%, -50%) rotate(-90deg)',
          objectFit: 'cover',
        })
      } else {
        setReviewStyle(undefined)
      }
    }
  }, [camera.state, camera.recordedUrl, camera.recordedRotated])

  // 남은 시간 매초 재계산 — deadline 절대시간 기준 (촬영·업로드 지연에도 안 어긋남)
  useEffect(() => {
    if (!active) return
    const deadlineTs = new Date(active.mission.deadline).getTime()
    const tick = () => {
      if (Number.isNaN(deadlineTs)) {
        // deadline이 없는 경로(앨범 등) 폴백: 로컬 감소
        setSecondsLeft((s) => Math.max(0, s - 1))
      } else {
        setSecondsLeft(Math.max(0, Math.round((deadlineTs - Date.now()) / 1000)))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active?.mission.deadline]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) {
    navigate(ROUTES.HOME, { replace: true })
    return null
  }

  const { mission, room } = active
  const title = mission.template?.title ?? '미션'

  async function handleSubmit() {
    if (isSubmitting || !camera.recordedBlob) return
    setIsSubmitting(true)
    setRecordedBlob(camera.recordedBlob)
    try {
      const filename = `mission_${mission.id}_${Date.now()}.mp4`
      const { presignedUrl, fileUrl } = await uploadApi.getPresignedUrl(filename, 'video')

      await fetch(presignedUrl, {
        method: 'PUT',
        body: camera.recordedBlob,
        headers: { 'Content-Type': 'video/mp4' },
      })

      // 녹화된 영상의 실제 픽셀 크기 (Lambda 콜라주 회전 판단 기준)
      const vw = reviewRef.current?.videoWidth ?? 0
      const vh = reviewRef.current?.videoHeight ?? 0

      await missionApi.submitVideo({
        missionId:  mission.id,
        videoUrl:   fileUrl,
        roomId:     Number(roomId) || room.id,
        width:      vw,
        height:     vh,
        horizontal: vw > vh,
        facingMode: camera.facingMode,
      })
    } catch (e) {
      console.error('제출 실패:', e)
      setIsSubmitting(false)
      return
    }
    clearMission()
    navigate(ROUTES.HOME, { replace: true })
  }

  const isRecording = camera.state === 'recording'
  const isDone      = camera.state === 'done'

  // 셔터 활성 여부: 촬영 전엔 previewing일 때만, 녹화 중엔 최소시간 지난 뒤에만
  const shutterDisabled = isRecording ? !camera.canStop : camera.state !== 'previewing'

  const hintText = isRecording
    ? camera.canStop
      ? `${formatTime(camera.recordingElapsed)} · 눌러서 완료`
      : `${VIDEO_MIN_S - camera.recordingElapsed}초 후 완료 가능`
    : isDone
      ? '확인 후 제출하세요'
      : `눌러서 촬영 (${VIDEO_MIN_S}~${VIDEO_MAX_S}초)`

  return (
    <div className={[styles.page, viewportPortrait ? styles.rotated : ''].join(' ')}>

      {/* ── 카메라 / 리뷰 영상 (풀스크린 배경) ─────────────────────────────────── */}
      <div className={styles.videoWrap} ref={videoWrapRef}>
        {/* 라이브 프리뷰 */}
        <video
          ref={previewVideoRef}
          className={[
            styles.video,
            facing === 'back' ? styles.noMirror : '',
            isDone ? styles.hidden : '',
          ].join(' ')}
          autoPlay
          playsInline
          muted
        />

        {/* 녹화 완료 리뷰 — 파일 자체가 WYSIWYG(회전·미러 구움).
            회전 구운 파일은 회전된 페이지 안에서 -90° 카운터 회전(reviewStyle)로 표시 */}
        <video
          ref={reviewRef}
          className={[
            styles.video,
            styles.noMirror,
            !isDone ? styles.hidden : '',
          ].join(' ')}
          style={isDone ? reviewStyle : undefined}
          playsInline
          muted
        />

        {/* 카메라 권한 없거나 에러일 때 */}
        {camera.state === 'error' && (
          <div className={styles.errorPlaceholder}>
            <span style={{ fontSize: 40 }}>📵</span>
            <p>카메라를 사용할 수 없어요</p>
            <p style={{ fontSize: 12, opacity: 0.5 }}>{camera.error}</p>
          </div>
        )}

        {/* idle 상태 (권한 요청 전) */}
        {camera.state === 'idle' && (
          <div className={styles.errorPlaceholder}>
            <span style={{ fontSize: 40 }}>📷</span>
            <p>카메라를 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* ── 격자 + 포커스 (프리뷰 영역 위) ────────────────────────────────────── */}
      {!isDone && (
        <div className={styles.stageOverlay}>
          <div className={styles.grid} />
          <div className={styles.focus} />
        </div>
      )}

      {/* ── 상단 인포바 (독립 컴포넌트) ──────────────────────────────────────── */}
      <MissionInfoBar
        roomName={room.name}
        title={title}
        timeLabel={formatTime(secondsLeft)}
        onBack={() => navigate(-1)}
      />

      {/* ── 우측 컨트롤 레일 (독립 컴포넌트) ─────────────────────────────────── */}
      <CameraControls
        isRecording={isRecording}
        isDone={isDone}
        shutterDisabled={shutterDisabled}
        torchOn={torchOn}
        hasMultiCam={hasMultiCam}
        isSubmitting={isSubmitting}
        recordingElapsed={camera.recordingElapsed}
        maxSeconds={VIDEO_MAX_S}
        hintText={hintText}
        onToggleTorch={toggleTorch}
        onShutter={() => camera.startRecording()}
        onStop={() => camera.stopRecording()}
        onFlip={handleFlipCamera}
        onRetake={() => camera.clearRecording()}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
