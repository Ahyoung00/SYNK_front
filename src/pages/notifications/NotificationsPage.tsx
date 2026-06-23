import { useEffect, useState } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { useNotificationStore } from '@/store/notificationStore'
import { notificationApi, missionApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AppNotification, NotificationsResponse } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './NotificationsPage.module.css'

type Tone = 'mission' | 'result' | 'member' | 'system'

const TONE_CLASS: Record<Tone, string> = {
  mission: styles.toneMission,
  result:  styles.toneResult,
  member:  styles.toneMember,
  system:  styles.toneSystem,
}

function toneFor(type: string): Tone {
  switch (type) {
    case 'MISSION_START':    return 'mission'
    case 'MISSION_COMPLETE':
    case 'SYNKLOG_CREATED':  return 'result'
    case 'MEMBER_JOIN':      return 'member'
    default:                 return 'system'
  }
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === 'mission') return (
    <svg viewBox="0 0 24 24"><path d="M13 3L5 13h5l-1 8 8-11h-5l1-7z" fill="currentColor" /></svg>
  )
  if (tone === 'result') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3" /><path d="M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
  )
  if (tone === 'member') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="8" r="3.5" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

/** ISO → "방금/N분 전/N시간 전/요일" */
function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return new Date(iso).toLocaleDateString('ko-KR', { weekday: 'short' })
}

function NotifItem({
  item,
  onRead,
  navigate,
  activeIds,
}: {
  item: AppNotification
  onRead: (id: number) => void
  navigate: NavigateFunction
  activeIds: Set<number>
}) {
  const tone = toneFor(item.type)
  const unread = !item.isRead
  // 진행 중인 미션일 때만 '지금 하기' 액션 노출 (끝난 미션은 일반 항목으로)
  const missionActive = item.type === 'MISSION_START'
    && item.relatedId != null
    && activeIds.has(item.relatedId)

  function go(e: React.MouseEvent, to?: string) {
    e.stopPropagation()
    if (unread) onRead(item.id)
    if (to) navigate(to)
  }

  let actions: React.ReactNode = null
  if (item.type === 'MISSION_START' && missionActive) {
    actions = (
      <div className={styles.ntActions}>
        <button className={[styles.ntBtn, styles.solid].join(' ')} onClick={(e) => go(e, ROUTES.HOME)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
          </svg>
          지금 하기
        </button>
        <button className={[styles.ntBtn, styles.ghost].join(' ')} onClick={(e) => go(e)}>나중에</button>
      </div>
    )
  } else if (item.type === 'MISSION_COMPLETE' || item.type === 'SYNKLOG_CREATED') {
    actions = (
      <div className={styles.ntActions}>
        <button className={[styles.ntBtn, styles.solid].join(' ')} onClick={(e) => go(e, ROUTES.HOME)}>결과 보기</button>
      </div>
    )
  }

  return (
    <div
      className={[styles.ntRow, TONE_CLASS[tone], unread ? styles.ntUnread : ''].join(' ')}
      onClick={() => unread && onRead(item.id)}
    >
      <div className={styles.ntIc}><ToneIcon tone={tone} /></div>
      <div className={styles.ntMain}>
        <div className={styles.ntHead}>
          <div className={styles.ttl}>{item.title}</div>
          <div className={styles.ntTime}>{relTime(item.createdAt)}</div>
        </div>
        <div className={styles.bod}>{item.content}</div>
        {actions}
      </div>
    </div>
  )
}

function NotifGroup({
  label,
  items,
  onRead,
  navigate,
  activeIds,
}: {
  label: string
  items: AppNotification[]
  onRead: (id: number) => void
  navigate: NavigateFunction
  activeIds: Set<number>
}) {
  if (items.length === 0) return null
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      <div className={styles.ntCard}>
        {items.map((item) => (
          <NotifItem key={item.id} item={item} onRead={onRead} navigate={navigate} activeIds={activeIds} />
        ))}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { setNotifications, markAllRead: storeMarkAllRead } = useNotificationStore()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [activeIds, setActiveIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    // 진행 중인 미션 id 집합 — MISSION_START 알림의 액션 노출 판단용
    missionApi.getActiveMission()
      .then((res) => setActiveIds(new Set(res.data.map((m) => m.id))))
      .catch(() => setActiveIds(new Set()))

    notificationApi
      .getNotifications()
      .then((res) => {
        setData(res.data)
        // 스토어엔 flat 배열로 저장 (unreadCount 계산용)
        setNotifications([...res.data.today, ...res.data.thisWeek])
      })
      .catch(console.error)
  }, [setNotifications])

  /** 단건 읽음 처리 */
  function handleRead(id: number) {
    notificationApi.markRead(id).catch(console.error)
    setData((prev) => {
      if (!prev) return prev
      const mark = (list: AppNotification[]) =>
        list.map((n) => n.id === id ? { ...n, isRead: true } : n)
      return { ...prev, today: mark(prev.today), thisWeek: mark(prev.thisWeek) }
    })
  }

  /** 전체 읽음 처리 */
  function handleMarkAllRead() {
    notificationApi.markAllRead().catch(console.error)
    storeMarkAllRead()
    setData((prev) => {
      if (!prev) return prev
      const markAll = (list: AppNotification[]) => list.map((n) => ({ ...n, isRead: true }))
      return { ...prev, today: markAll(prev.today), thisWeek: markAll(prev.thisWeek) }
    })
  }

  const isEmpty = !data || (data.today.length === 0 && data.thisWeek.length === 0)

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="알림"
        right={
          <button
            style={{ color: '#3b82f6', fontWeight: 700, fontSize: 'var(--text-sm)' }}
            onClick={handleMarkAllRead}
          >
            모두 읽음
          </button>
        }
      />

      {/* ── 알림 목록 ─────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {isEmpty ? (
          <div className={styles.esWrap}>
            <div className={styles.esMark}>
              <div className={[styles.esRing, styles.esRingR1].join(' ')} />
              <div className={[styles.esRing, styles.esRingR2].join(' ')} />
              <div className={styles.esGlow} />
              <div className={styles.esTile}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.3 21a2 2 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className={[styles.esSpark, styles.esSparkS1].join(' ')} />
                <span className={[styles.esSpark, styles.esSparkS2].join(' ')} />
              </div>
            </div>
            <div className={styles.esTitle}>아직 새 알림이 없어요</div>
            <div className={styles.esSub}>
              미션이 시작되거나 결과가 나오면<br />여기로 가장 먼저 알려드릴게요.
            </div>
            <button className={styles.esCta} onClick={() => navigate(ROUTES.ROOMS)}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M13 3L5 13h5l-1 8 8-11h-5l1-7z" fill="currentColor" /></svg>
              내 방으로 가기
            </button>
          </div>
        ) : (
          <>
            <NotifGroup label="오늘"    items={data?.today    ?? []} onRead={handleRead} navigate={navigate} activeIds={activeIds} />
            <NotifGroup label="이번 주" items={data?.thisWeek ?? []} onRead={handleRead} navigate={navigate} activeIds={activeIds} />
          </>
        )}
      </div>
    </div>
  )
}
