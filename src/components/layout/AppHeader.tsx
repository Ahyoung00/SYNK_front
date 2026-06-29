import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '@/store/notificationStore'
import { notificationApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import styles from './AppHeader.module.css'

interface AppHeaderProps {
  /** 브랜드 아래 소제목 (예: "아영님의 방", "내가 완료한 미션") */
  subtitle?: React.ReactNode
}

/**
 * 탭 페이지 공통 헤더
 * 좌: SYNK 브랜드 + subtitle / 우: 벨 아이콘
 */
export default function AppHeader({ subtitle }: AppHeaderProps) {
  const navigate = useNavigate()
  const unread          = useNotificationStore((s) => s.unreadCount)
  const setNotifications = useNotificationStore((s) => s.setNotifications)

  // 앱이 포그라운드로 돌아올 때(백그라운드 알림 수신 후 포함) 뱃지 즉시 갱신
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      notificationApi.getNotifications()
        .then((res) => {
          const data = res.data
          const all = [...(data.today ?? []), ...(data.thisWeek ?? [])]
          setNotifications(all)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setNotifications])

  return (
    <div className={styles.header}>
      <div>
        <span className={styles.brand}>SYNK</span>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <button
        className={styles.bellBtn}
        onClick={() => navigate(ROUTES.NOTIFICATIONS)}
        aria-label="알림"
      >
        <BellIcon />
        {unread > 0 && <span className={styles.bellDot} />}
      </button>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
