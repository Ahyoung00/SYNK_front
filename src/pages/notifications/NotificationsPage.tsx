import { useNotificationStore } from '@/store/notificationStore'
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

// 목업 알림 (백엔드 연동 전)
const MOCK_GROUPS: { label: string; items: NotifItem[] }[] = [
  {
    label: '오늘',
    items: [
      { id: 1, type: 'MISSION_START',    title: '새벽반에서 미션이 올랐어요',   sub: '지금 네 표정 그대로 찍기 · 22:30', unread: true  },
      { id: 2, type: 'MISSION_COMPLETE', title: '결과가 도착했어요',             sub: '새벽반 · 5명 모두 참여 · 22:35',  unread: false },
      { id: 3, type: 'SYNKLOG_CREATED',  title: 'SYNKLOG 생성 완료',            sub: '새벽반 · 2026.05.07 · 22:40',    unread: false },
    ],
  },
  {
    label: '이번 주',
    items: [
      { id: 4, type: 'MEMBER_JOIN',  title: '지민님이 대학동기에 들어왔어요', sub: '2일 전',  unread: false },
      { id: 5, type: 'ACHIEVEMENT',  title: '이번 주 도감 5개 완료!',         sub: '3일 전',  unread: false },
    ],
  },
]

interface NotifItem {
  id: number
  type: string
  title: string
  sub: string
  unread: boolean
}

export default function NotificationsPage() {
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="알림"
        right={<button style={{ color: '#3b82f6', fontWeight: 700, fontSize: 'var(--text-sm)' }} onClick={markAllRead}>모두 읽음</button>}
      />

      {/* ── 알림 목록 ────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {MOCK_GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>{group.label}</p>
            <div className={styles.groupList}>
              {group.items.map((item) => {
                const meta = TYPE_META[item.type] ?? TYPE_META['MEMBER_JOIN']
                return (
                  <div key={item.id} className={styles.notifRow}>
                    <div className={styles.iconWrap} style={{ background: meta.bg }}>
                      <span className={styles.notifIcon}>{meta.icon}</span>
                    </div>
                    <div className={styles.notifText}>
                      <span className={styles.notifTitle}>{item.title}</span>
                      <span className={styles.notifSub}>{item.sub}</span>
                    </div>
                    {item.unread && <span className={styles.unreadDot} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

