import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCamera, VIDEO_MIN_S, VIDEO_MAX_S, type CameraFacing } from '@/hooks/useCamera'
import { useMissionStore } from '@/store/missionStore'
import { missionApi, uploadApi } from '@/services/api/endpoints'
import { CountdownTimer } from '@/components/mission/CountdownTimer'
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
    camera.stopPreview()
    await camera.startPreview(next)
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

  // 카메라 분할 레이아웃

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

  return (
    <div className={[styles.page, isPortrait ? styles.rotated : ''].join(' ')}>
      {/* ── 카메라 / 리뷰 영상 ──────────────────────────────────────────────── */}
      <div className={styles.videoWrap}>
        {/* 라이브 프리뷰 */}
        <video
          ref={previewVideoRef}
          className={[
            styles.video,
            facing === 'back' ? styles.noMirror : '',
            camera.state === 'done' ? styles.hidden : '',
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
            camera.state !== 'done' ? styles.hidden : '',
            // 폰 가로 촬영 시에만 회전 보정 (rawFacingMode가 실제 보고된 경우 = 폰)
            camera.isHorizontal && camera.rawFacingMode === 'user'        ? styles.reviewPhoneFront
              : camera.isHorizontal && camera.rawFacingMode === 'environment' ? styles.reviewPhoneBack
              // 세로 or 노트북 가로: 후면만 미러 제거, 그 외 기존 미러 유지
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

      {/* ── 상단 오버레이 ────────────────────────────────────────────────────── */}
      <div className={styles.overlayTop}>
        {/* 뒤로가기 / 카메라 전환 */}
        <div className={styles.topControls}>
          <button className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="뒤로">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          {hasMultiCam && (camera.state === 'previewing' || camera.state === 'idle') && (
            <button className={styles.iconBtn} onClick={handleFlipCamera} aria-label="카메라 전환">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
                <path d="M22 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
              </svg>
            </button>
          )}
        </div>

        <div className={styles.topRow}>
          <span className={styles.roomName}>{room.name}</span>
          <CountdownTimer secondsLeft={secondsLeft} size="sm" showLabel={false} />
        </div>
        <p className={styles.missionTitle}>{title}</p>
        {mission.template?.description && (
          <p className={styles.missionDesc}>{mission.template.description}</p>
        )}
      </div>

      {/* ── 하단 오버레이 ────────────────────────────────────────────────────── */}
      <div className={styles.overlayBottom}>

        {/* 녹화 전 / 미리보기 중 */}
        {(camera.state === 'previewing' || camera.state === 'idle' || camera.state === 'error') && (
          <div className={styles.controls}>
            <button
              className={styles.recordBtn}
              onClick={() => camera.startRecording()}
              disabled={camera.state !== 'previewing'}
              aria-label="촬영 시작"
            >
              <span className={styles.recordDot} />
            </button>
            <p className={styles.hint}>버튼을 눌러 촬영하세요 ({VIDEO_MIN_S}~{VIDEO_MAX_S}초)</p>
          </div>
        )}

        {/* 녹화 중 */}
        {camera.state === 'recording' && (
          <div className={styles.recordingControls}>
            <RecordingProgressBar elapsed={camera.recordingElapsed} max={VIDEO_MAX_S} />
            <div className={styles.recordingRow}>
              <span className={styles.recLabel}>
                🔴 {formatTime(camera.recordingElapsed)}
              </span>
              <button
                className={styles.stopBtn}
                onClick={() => camera.stopRecording()}
                disabled={!camera.canStop}
              >
                {camera.canStop ? '완료' : `${VIDEO_MIN_S - camera.recordingElapsed}초 후 가능`}
              </button>
            </div>
          </div>
        )}

        {/* 녹화 완료 — 미리보기 */}
        {camera.state === 'done' && (
          <div className={styles.reviewControls}>
            <button
              className={styles.retakeBtn}
              onClick={() => camera.clearRecording()}
            >
              재촬영
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 녹화 진행 바 ───────────────────────────────────────────────────────────────

function RecordingProgressBar({ elapsed, max }: { elapsed: number; max: number }) {
  const pct = Math.min(100, (elapsed / max) * 100)
  return (
    <div className={styles.progressTrack}>
      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
    </div>
  )
}
