import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCamera, VIDEO_MIN_S, VIDEO_MAX_S } from '@/hooks/useCamera'
import { useMissionStore } from '@/store/missionStore'
import { CountdownTimer } from '@/components/mission/CountdownTimer'
import { ROUTES } from '@/constants'
import { formatTime } from '@/hooks/useTimer'
import styles from './MissionCameraPage.module.css'

export default function MissionCameraPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const active = useMissionStore((s) => s.active)
  const setRecordedBlob = useMissionStore((s) => s.setRecordedBlob)

  const camera = useCamera()
  const previewVideoRef = camera.previewRef as React.RefObject<HTMLVideoElement>
  // 녹화된 영상 미리보기용 별도 video ref
  const reviewRef = useRef<HTMLVideoElement | null>(null)

  // 페이지 진입 시 카메라 켜기
  useEffect(() => {
    if (!camera.isNative) {
      camera.startPreview('front')
    }
    return () => {
      camera.stopPreview()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 녹화 완료되면 미리보기 재생
  useEffect(() => {
    if (camera.state === 'done' && camera.recordedUrl && reviewRef.current) {
      reviewRef.current.src = camera.recordedUrl
      reviewRef.current.loop = true
      reviewRef.current.play()
    }
  }, [camera.state, camera.recordedUrl])

  if (!active) {
    navigate(ROUTES.HOME, { replace: true })
    return null
  }

  const { mission, room } = active
  const title = mission.template?.title ?? '미션'
  const secondsLeft = active.seconds_left

  function handleSubmit() {
    if (camera.recordedBlob) {
      setRecordedBlob(camera.recordedBlob)
    }
    navigate(ROUTES.MISSION_WAITING(Number(roomId) || room.id))
  }

  return (
    <div className={styles.page}>
      {/* ── 카메라 / 리뷰 영상 ──────────────────────────────────────────────── */}
      <div className={styles.videoWrap}>
        {/* 라이브 프리뷰 */}
        <video
          ref={previewVideoRef}
          className={[
            styles.video,
            camera.state === 'done' ? styles.hidden : '',
          ].join(' ')}
          autoPlay
          playsInline
          muted
        />

        {/* 녹화 완료 리뷰 */}
        <video
          ref={reviewRef}
          className={[
            styles.video,
            camera.state !== 'done' ? styles.hidden : '',
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
            >
              제출하기
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
