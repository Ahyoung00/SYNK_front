import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useMissionStore } from '@/store/missionStore'
import { ROUTES } from '@/constants'
import { createMockMission } from '@/utils/mockMission'
import AppHeader from '@/components/layout/AppHeader'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const active = useMissionStore((s) => s.active)
  const setActive = useMissionStore((s) => s.setActive)
  const isDev = import.meta.env.DEV

  function handleFireMockMission() {
    const mock = createMockMission()
    setActive(mock)
    navigate(ROUTES.MISSION_DETAIL(mock.room.id))
  }

  function handleEnterActiveMission() {
    if (!active) return
    navigate(ROUTES.MISSION_DETAIL(active.room.id))
  }

  const firstName = user?.name ?? '유현'

  return (
    <div className={styles.page}>

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <AppHeader subtitle={`안녕하세요, ${firstName}님 👋`} />

      <div className={styles.scroll}>

        {/* ── 활성 미션 알림 배너 ──────────────────────────────────────────── */}
        {active && (
          <button
            className={styles.alertBanner}
            onClick={handleEnterActiveMission}
          >
            <div className={styles.alertDot} />
            <div className={styles.alertText}>
              <p className={styles.alertTitle}>
                ⚡ {active.room.name}에서 미션이 울렸어요!
              </p>
              <p className={styles.alertSub}>
                {active.mission.template?.title} · 지금 바로 참여하세요
              </p>
            </div>
            <span className={styles.alertArrow}>›</span>
          </button>
        )}

        {/* ── 미션 없을 때 대기 상태 ────────────────────────────────────── */}
        {!active && (
          <div className={styles.waitingCard}>
            <span className={styles.waitingIcon}>🔕</span>
            <p className={styles.waitingTitle}>아직 아무런 미션이<br />울리지 않았습니다</p>
            <p className={styles.waitingDesc}>미션이 울리면 홈 화면에 바로 알려드릴게요</p>
            <div className={styles.waitingBadge}>랜덤 알림을 기다리는 중</div>
          </div>
        )}

        {/* ── 현재 상태 안내 ────────────────────────────────────────────── */}
        {!active && (
          <div className={styles.statusCard}>
            <div className={styles.statusRow}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>참여 가능한 미션 없음</span>
            </div>
            <p className={styles.statusDesc}>방 탭에서 방을 확인하거나 만들어보세요</p>
          </div>
        )}

        {/* ── DEV 전용 ─────────────────────────────────────────────────── */}
        {isDev && (
          <div className={styles.devSection}>
            <p className={styles.devLabel}>DEV ONLY</p>
            <button className={styles.devBtn} onClick={handleFireMockMission}>
              🛠️ 미션 발생 시뮬레이션
            </button>
            <p className={styles.devHint}>
              홈 → 미션상세 → 카메라 → 대기 → 처리중 → 콜라주 결과
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

