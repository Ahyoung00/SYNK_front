import styles from './MissionInfoBar.module.css'

interface Props {
  /** 방 이름 */
  roomName: string
  /** 미션 제목 */
  title: string
  /** 남은 시간 표시용 라벨 (예: "04:29") */
  timeLabel: string
  /** 뒤로가기 */
  onBack: () => void
}

/** 미션 촬영 화면 상단 인포바 — 독립 컴포넌트 (위치/스타일 자체 관리) */
export default function MissionInfoBar({ roomName, title, timeLabel, onBack }: Props) {
  return (
    <div className={styles.topBar}>
      <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={styles.titleGroup}>
        <span className={styles.roomRow}>
          <span className={styles.roomDot} />
          {roomName}
        </span>
        <span className={styles.title}>{title}</span>
      </div>

      <div className={styles.timerPill}>
        <span className={styles.timerDot} />
        {timeLabel}
      </div>
    </div>
  )
}
