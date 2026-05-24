import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { useTimer } from '@/hooks/useTimer'
import { CountdownTimer } from '@/components/mission/CountdownTimer'
import { ParticipationRow } from '@/components/mission/ParticipationRow'
import { ROUTES } from '@/constants'
import { createMockMission } from '@/utils/mockMission'
import styles from './MissionDetailPage.module.css'

export default function MissionDetailPage() {
  const { roomId: _roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const active = useMissionStore((s) => s.active)
  const setActive = useMissionStore((s) => s.setActive)
  const myUser = useAuthStore((s) => s.user)
  const { secondsLeft, start } = useTimer()

  // 미션 데이터 초기화 (백엔드 없으면 mock)
  useEffect(() => {
    if (!active) {
      const mock = createMockMission()
      setActive(mock)
      start(mock.seconds_left)
    } else {
      start(active.seconds_left)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 시간이 0이 되면 "놓침" 화면으로
  useEffect(() => {
    if (secondsLeft === 0 && active) {
      navigate(ROUTES.HOME, { replace: true })
    }
  }, [secondsLeft, active, navigate])

  if (!active) return null

  const { mission, room, participations } = active
  const title = mission.template?.title ?? '미션'
  const desc = mission.template?.description ?? ''
  const doneCount = participations.filter((p) => p.state === 'done').length

  function handleParticipate() {
    navigate(ROUTES.MISSION_CAMERA(room.id))
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <span className={styles.roomBadge}>⚡ {room.name}</span>
        <p className={styles.headerTitle}>미션이 울렸어요!</p>
        <p className={styles.headerSub}>5분 안에 참여해야 기록돼요</p>
      </div>

      {/* 타이머 */}
      <div className={styles.timerSection}>
        <CountdownTimer secondsLeft={secondsLeft} size="lg" showLabel />
      </div>

      {/* 미션 정보 */}
      <div className={styles.missionCard}>
        <span className={styles.missionLabel}>오늘의 미션</span>
        <h2 className={styles.missionTitle}>{title}</h2>
        {desc && <p className={styles.missionDesc}>{desc}</p>}
      </div>

      {/* 참여 현황 */}
      <div className={styles.participationSection}>
        <ParticipationRow
          participations={participations}
          myUserId={myUser?.id}
          layout="row"
        />
      </div>

      {/* CTA */}
      <div className={styles.footer}>
        <button
          className={styles.ctaButton}
          onClick={handleParticipate}
          disabled={doneCount === participations.length}
        >
          참여하기
        </button>
      </div>
    </div>
  )
}
