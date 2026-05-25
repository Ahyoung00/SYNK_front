import { useEffect, useState } from 'react'
import { useNotificationStore } from '@/store/notificationStore'
import { notificationApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationsResponse } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './NotificationsPage.module.css'

// 알림 타입별 아이콘 및 색상
const TYPE_META: Record<string, { icon: string; bg: string }> = {
  MISSION_START:    { icon: '⚡', bg: 'rgba(250, 204, 21, 0.15)'  },
  MISSION_COMPLETE: { icon: '✅', bg: 'rgba(74, 222, 128, 0.15)'  },
  SYNKLOG_CREATED:  { icon: '🎬', bg: 'rgba(168, 85, 247, 0.15)'  },
  MEMBER_JOIN:      { icon: '👤', bg: 'rgba(255,255,255, 0.07)'   },
  ACHIEVEMENT:      { icon: '🔥', bg: 'rgba(249, 115, 22, 0.15)'  },
}

function NotifGroup({ label, items }: { label: string; items: AppNotification[] }) {
  if (items.length === 0) return null
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      <div className={styles.groupList}>
        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META['MEMBER_JOIN']
          return (
            <div key={item.id} className={styles.notifRow}>
              <div className={styles.iconWrap} style={{ background: meta.bg }}>
                <span className={styles.notifIcon}>{meta.icon}</span>
              </div>
              <div className={styles.notifText}>
                <span className={styles.notifTitle}>{item.title}</span>
                <span className={styles.notifSub}>{item.content}</span>
              </div>
              {!item.isRead && <span className={styles.unreadDot} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { setNotifications, markAllRead } = useNotificationStore()
  const [data, setData] = useState<NotificationsResponse | null>(null)

  useEffect(() => {
    notificationApi
      .getNotifications()
      .then((res) => {
        setData(res.data)
        // 스토어엔 flat 배열로 저장 (unreadCount 계산용)
        setNotifications([...res.data.today, ...res.data.thisWeek])
      })
      .catch(console.error)
  }, [setNotifications])

  const isEmpty = !data || (data.today.length === 0 && data.thisWeek.length === 0)

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="알림"
        right={
          <button
            style={{ color: '#3b82f6', fontWeight: 700, fontSize: 'var(--text-sm)' }}
            onClick={() => {
              notificationApi.markAllRead().catch(console.error)
              markAllRead()
            }}
          >
            모두 읽음
          </button>
        }
      />

      {/* ── 알림 목록 ─────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {isEmpty ? (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            알림이 없어요
          </p>
        ) : (
          <>
            <NotifGroup label="오늘"    items={data?.today    ?? []} />
            <NotifGroup label="이번 주" items={data?.thisWeek ?? []} />
          </>
        )}
      </div>
    </div>
  )
}
