import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCamera, VIDEO_MIN_S, VIDEO_MAX_S, type CameraFacing } from '@/hooks/useCamera'
import { useMissionStore } from '@/store/missionStore'
import { missionApi, uploadApi } from '@/services/api/endpoints'
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
  const [facing, setFacing] = useState<CameraFacing>('front')
  const [hasMultiCam, setHasMultiCam] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(active?.seconds_left ?? 0)
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia('(orientation: portrait)').matches
  )

  // portrait일 때 CSS 회전으로 가로 강제 (iOS 포함 전 환경 대응)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // 페이지 진입 시 카메라 켜기
  useEffect(() => {
    ;(screen.orientation as any)?.lock?.('landscape').catch(() => {})

    camera.startPreview('front').then(() => {
      navigator.mediaDevices?.enumerateDevices?.()
        .then((devices) => {
          const cams = devices.filter((d) => d.kind === 'videoinput')
          setHasMultiCam(cams.length > 1)
        })
        .catch(() => setHasMultiCam(false))
    })
    return () => {
      screen.orientation?.unlock?.()
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
    }
  }, [camera.state, camera.recordedUrl])

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

      await missionApi.submitVideo({
        missionId:  mission.id,
        videoUrl:   fileUrl,
        roomId:     Number(roomId) || room.id,
        horizontal: camera.isHorizontal,
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
    <div className={[styles.page, isPortrait ? styles.rotated : ''].join(' ')}>
      {/* ── 카메라 / 리뷰 영상 (풀스크린 배경) ─────────────────────────────────── */}
      <div className={styles.videoWrap}>
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

        {/* 녹화 완료 리뷰 — raw 영상이라 카메라별 회전 보정 필요 (Lambda와 동일) */}
        <video
          ref={reviewRef}
          className={[
            styles.video,
            !isDone ? styles.hidden : '',
            camera.isHorizontal && camera.rawFacingMode === 'user'        ? styles.reviewPhoneFront
              : camera.isHorizontal && camera.rawFacingMode === 'environment' ? styles.reviewPhoneBack
              : facing === 'back'                                             ? styles.noMirror
              : '',
          ].join(' ')}
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

      {/* ── 상단 인포바 ──────────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className={styles.titleGroup}>
          <span className={styles.roomRow}>
            <span className={styles.roomDot} />
            {room.name}
          </span>
          <span className={styles.title}>{title}</span>
        </div>

        <div className={styles.timerPill}>
          <span className={styles.timerDot} />
          {formatTime(secondsLeft)}
        </div>
      </div>

      {/* ── 우측 컨트롤 레일 ─────────────────────────────────────────────────── */}
      <div className={styles.rail}>
        {/* 플래시 */}
        <button
          className={[styles.railIcon, torchOn ? styles.railIconOn : ''].join(' ')}
          onClick={toggleTorch}
          aria-label="플래시"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />
          </svg>
        </button>

        {isDone ? (
          /* 리뷰: 재촬영 / 제출 */
          <div className={styles.reviewStack}>
            <button className={styles.retakeBtn} onClick={() => camera.clearRecording()}>
              재촬영
            </button>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '제출 중' : '제출'}
            </button>
          </div>
        ) : (
          <div className={styles.shutterArea}>
            <div className={styles.shutterRow}>
              <button
                className={styles.shutterRing}
                onClick={isRecording ? () => camera.stopRecording() : () => camera.startRecording()}
                disabled={shutterDisabled}
                aria-label={isRecording ? '촬영 완료' : '촬영 시작'}
              >
                <span className={styles.shutterCore}>
                  {isRecording && <span className={styles.shutterStop} />}
                </span>
              </button>

              <div className={styles.slider}>
                <div
                  className={styles.sliderFill}
                  style={{ height: isRecording ? `${(camera.recordingElapsed / VIDEO_MAX_S) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {hasMultiCam && !isRecording && (
              <button className={styles.railFlip} onClick={handleFlipCamera} aria-label="카메라 전환">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
                  <path d="M22 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 힌트 */}
        <p className={styles.hint}>{hintText}</p>
      </div>
    </div>
  )
}
