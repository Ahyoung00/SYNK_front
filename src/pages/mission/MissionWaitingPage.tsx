import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import styles from './MissionWaitingPage.module.css'

export default function MissionWaitingPage() {
  const { roomId }            = useParams<{ roomId: string }>()
  const navigate              = useNavigate()
  const active                = useMissionStore((s) => s.active)
  const updateParticipation   = useMissionStore((s) => s.updateParticipation)
  const myUser                = useAuthStore((s) => s.user)

  // 개발용: 내 상태 → done, 나머지 멤버도 단계적으로 완료
  useEffect(() => {
    if (!active) return

    const myId = myUser?.id ?? 1
    const me = active.participations.find((p) => p.user.id === myId)
    if (me) updateParticipation({ ...me, state: 'done' })

    const others = active.participations.filter((p) => p.user.id !== myId)
    const timers: ReturnType<typeof setTimeout>[] = []
    others.forEach((p, i) => {
      const t = setTimeout(() => updateParticipation({ ...p, state: 'done' }), (i + 1) * 1800)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (active?.seconds_left === 0) {
      navigate(ROUTES.MISSION_PROCESSING(Number(roomId) || active.room.id))
    }
  }, [active, navigate, roomId])

  if (!active) { navigate(ROUTES.HOME, { replace: true }); return null }

  const { participations, seconds_left } = active
  const mm = String(Math.floor(seconds_left / 60)).padStart(2, '0')
  const ss = String(seconds_left % 60).padStart(2, '0')

  return (
    <div className={styles.page}>
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
            <div key={p.user.id} className={styles.memberRow}>
              <div className={styles.memberAvatar}>
                {p.user.profile_image
                  ? <img src={p.user.profile_image} alt={p.user.name} className={styles.memberImg} />
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
    </div>
  )
}
