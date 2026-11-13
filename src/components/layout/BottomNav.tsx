import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './BottomNav.module.css'

// 탭 순서: 홈 / 방 / 도감 / 마이
// 알림은 홈 헤더 우상단 벨 아이콘으로 진입
const tabs = [
  { to: ROUTES.HOME,       label: '홈',   icon: IconHome },
  { to: ROUTES.ROOMS,      label: '방',   icon: IconDoor },
  { to: ROUTES.COLLECTION, label: '도감', icon: IconBook },
  { to: ROUTES.PROFILE,    label: '마이', icon: IconUser },
] as const

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.HOME}
          className={({ isActive }) =>
            [styles.tab, isActive ? styles.active : ''].join(' ')
          }
        >
          <span className={styles.iconWrap}>
            <Icon />
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

/* ── SVG 아이콘 ───────────────────────────────────────────────────────────── */

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.9 10.7 12 4.3l8.1 6.4" />
      <path d="M5.7 9.6V18a1.6 1.6 0 0 0 1.6 1.6h2.4V15a2.3 2.3 0 0 1 4.6 0v4.6h2.4A1.6 1.6 0 0 0 18.3 18V9.6" />
    </svg>
  )
}

function IconDoor() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="4" y="4" width="7" height="7" rx="2.3" fill="none" />
      <rect x="13" y="4" width="7" height="7" rx="2.3" fill="none" />
      <rect x="4" y="13" width="7" height="7" rx="2.3" fill="none" />
      <rect x="13" y="13" width="7" height="7" rx="2.3" fill="none" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.2" r="3.6" fill="none" />
      <path d="M5.3 19.4c0-3.7 3-6.2 6.7-6.2s6.7 2.5 6.7 6.2" fill="none" />
    </svg>
  )
}
