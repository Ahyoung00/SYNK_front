import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { useRoomEvents } from '@/hooks/useRoomEvents'
import { ROUTES } from '@/constants'
import styles from './MissionWaitingPage.module.css'

export default function MissionWaitingPage() {
  const { roomId }          = useParams<{ roomId: string }>()
  const navigate            = useNavigate()
  const active              = useMissionStore((s) => s.active)
  const previewUrl          = useMissionStore((s) => s.previewUrl)
  const updateParticipation = useMissionStore((s) => s.updateParticipation)
  const myUser              = useAuthStore((s) => s.user)

  // 로컬 카운트다운 (active.seconds_left 기준 wall-clock)
  const [secondsLeft, setSecondsLeft] = useState(active?.seconds_left ?? 0)
  const [showVideo, setShowVideo]     = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // WebSocket: 다른 멤버가 제출하면 참여 현황 갱신 / 새 미션 발동 시 시작 화면 이동
  useRoomEvents(Number(roomId) || active?.room.id, {
    onMemberSubmitted: (e) => {
      const cur = useMissionStore.getState().active
      if (!cur || e.userId == null) return
      const target = cur.participations.find((p) => p.user.userId === Number(e.userId))
      if (target && target.state !== 'done') {
        updateParticipation({ ...target, state: 'done' })
      }
    },
    onMissionFired: (e) => {
      const targetRoom = Number(e.roomId) || Number(roomId) || active?.room.id
      if (targetRoom) navigate(ROUTES.MISSION_DETAIL(targetRoom))
    },
  })

  // 마운트 시: 내 상태를 즉시 '완료'로 표시
  useEffect(() => {
    if (!active || !myUser) return
    const me = active.participations.find((p) => p.user.userId === myUser.userId)
    if (me && me.state !== 'done') {
      updateParticipation({ ...me, state: 'done' })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 카운트다운 — wall-clock 기반
  useEffect(() => {
    if (!active) return
    const startedAt  = Date.now()
    const initialSec = active.seconds_left
    setSecondsLeft(initialSec)

    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSecondsLeft(Math.max(0, initialSec - elapsed))
    }, 1000)
    return () => clearInterval(id)
  }, [active?.mission.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 전원 완료 → 처리 중
  useEffect(() => {
    if (!active) return
    const allDone = active.participations.every((p) => p.state === 'done')
    if (allDone) {
      const t = setTimeout(() => {
        navigate(ROUTES.MISSION_PROCESSING(Number(roomId) || active.room.id))
      }, 800)
      return () => clearTimeout(t)
    }
  }, [active, navigate, roomId])

  // 시간 종료 → 처리 중
  useEffect(() => {
    if (secondsLeft === 0) {
      navigate(ROUTES.MISSION_PROCESSING((Number(roomId) || active?.room.id) ?? 0))
    }
  }, [secondsLeft, navigate, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) { navigate(ROUTES.HOME, { replace: true }); return null }

  const { participations } = active
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className={styles.page}>
      {/* ── 뒤로가기 ──────────────────────────────────────────────────────────── */}
      <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      {/* ── 원형 타이머 ─────────────────────────────────────────────────────── */}
      <div className={styles.timerSection}>
        <div className={styles.timerCircle}>
          <span className={styles.timerText}>{mm}:{ss}</span>
        </div>
        <p className={styles.timerMsg}>
          전원 참여하거나<br />남은 시간을 기다려주세요!
        </p>
      </div>

      {/* ── 멤버 참여 현황 ────────────────────────────────────────────────────── */}
      <div className={styles.memberList}>
        {participations.map((p) => {
          const done = p.state === 'done'
          return (
            <div key={p.user.userId} className={styles.memberRow}>
              <div className={styles.memberAvatar}>
                {p.user.profileImage
                  ? <img src={p.user.profileImage} alt={p.user.name} className={styles.memberImg} />
                  : <span className={styles.memberInitial}>{p.user.name.charAt(0)}</span>
                }
              </div>
              <span className={styles.memberName}>{p.user.name}</span>
              <span className={[styles.memberStatus, done ? styles.done : styles.pending].join(' ')}>
                {done ? '완료' : '미완료'}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── 재촬영 / 영상 보기 ───────────────────────────────────────────────── */}
      <div className={styles.actionRow}>
        {previewUrl && (
          <button className={styles.watchBtn} onClick={() => setShowVideo(true)}>
            🎬 내 영상 보기
          </button>
        )}
        <button
          className={styles.retakeBtn}
          onClick={() => navigate(ROUTES.MISSION_CAMERA(Number(roomId) || active?.room.id))}
        >
          📷 재촬영
        </button>
      </div>

      {/* ── 홈으로 돌아가기 ───────────────────────────────────────────────────── */}
      <button
        className={styles.homeBtn}
        onClick={() => navigate(ROUTES.HOME, { replace: true })}
      >
        홈으로 돌아가기
      </button>

      {/* ── 영상 미리보기 모달 ────────────────────────────────────────────────── */}
      {showVideo && previewUrl && (
        <div className={styles.videoModal} onClick={() => setShowVideo(false)}>
          <div className={styles.videoModalInner} onClick={(e) => e.stopPropagation()}>
            <video
              ref={videoRef}
              src={previewUrl}
              className={styles.videoPlayer}
              autoPlay
              loop
              playsInline
              muted
            />
            <button className={styles.videoCloseBtn} onClick={() => setShowVideo(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
