import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './NavHeader.module.css'

interface NavHeaderProps {
  /** 중앙 타이틀 */
  title: string
  /** 타이틀 오른쪽에 붙는 추가 요소 (예: 채팅 아이콘) */
  titleExtra?: ReactNode
  /** 우측 액션 요소 (예: "저장" 버튼). 없으면 빈 공간으로 균형 유지 */
  right?: ReactNode
  /** 뒤로가기 콜백 (기본값: navigate(-1)) */
  onBack?: () => void
}

/**
 * 서브페이지 공통 헤더
 * 좌: ← 뒤로 / 중앙: 타이틀 / 우: 액션 or 빈 영역
 */
export default function NavHeader({ title, titleExtra, right, onBack }: NavHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.header}>
      <button
        className={styles.backBtn}
        onClick={onBack ?? (() => navigate(-1))}
        aria-label="뒤로"
      >
        <BackIcon />
      </button>

      <div className={styles.center}>
        <span className={styles.title}>{title}</span>
        {titleExtra}
      </div>

      <div className={styles.right}>
        {right ?? <span />}
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}
