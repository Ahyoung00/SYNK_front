import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi } from '@/services/api/endpoints'
import type { RoomDetail } from '@/types'
import type { ParticipationStatsResponse, ParticipationMemberStat } from '@/types'
import { useAuthStore } from '@/store/authStore'
import NavHeader from '@/components/layout/NavHeader'
import Loading from '@/components/ui/Loading'
import styles from './RoomParticipationPage.module.css'

// 주 시작일(월요일) 계산
function getWeekStart(offset: number): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // 월요일로
  d.setDate(d.getDate() + diff - offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

// 방 생성일 기준 최대 weekOffset 계산
function maxWeekOffset(createdAt: string | null | undefined): number {
  if (!createdAt) return 52 // 알 수 없으면 1년
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  const thisWeekStart = getWeekStart(0)
  const diffMs = thisWeekStart.getTime() - created.getTime()
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

function formatWeekLabel(offset: number): string {
  if (offset === 0) return '이번 주'
  if (offset === 1) return '지난 주'
  const start = getWeekStart(offset)
  return `${start.getMonth() + 1}월 ${Math.ceil(start.getDate() / 7)}주`
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) {
    const s = getWeekStart(0)
    const e = new Date(s); e.setDate(s.getDate() + 6)
    return `${s.getMonth()+1}/${s.getDate()} – ${e.getMonth()+1}/${e.getDate()}`
  }
  const s = new Date(startDate)
  const e = new Date(endDate)
  return `${s.getMonth()+1}/${s.getDate()} – ${e.getMonth()+1}/${e.getDate()}`
}

const RANK_COLORS = ['#4ade80', '#4ade80', '#4ade80', '#8B5CF6', '#6E8BFF', '#FF9A3C', '#FF9A3C']
function rankColor(rank: number) {
  return RANK_COLORS[Math.min(rank - 1, RANK_COLORS.length - 1)]
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className={styles.rankBadge}>🥇</span>
  if (rank === 2) return <span className={styles.rankBadge}>🥈</span>
  if (rank === 3) return <span className={styles.rankBadge}>🥉</span>
  return <span className={styles.rankNum}>{rank}</span>
}

const AVATAR_COLORS = ['#6E8BFF', '#9B6BFF', '#FF8C42', '#2DDAB8', '#FF6B9D', '#46D7FF', '#8B5CF6']
function avatarBg(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length]
}

function MemberCard({ member, isMe }: { member: ParticipationMemberStat; isMe: boolean }) {
  const color = rankColor(member.rank)
  return (
    <div className={styles.memberCard}>
      <RankBadge rank={member.rank} />
      <div className={styles.avatar} style={{ background: avatarBg(member.userId) }}>
        {member.profileImage
          ? <img src={member.profileImage} alt={member.name} className={styles.avatarImg} />
          : (member.name?.charAt(0) ?? '?')
        }
      </div>
      <div className={styles.memberInfo}>
        <div className={styles.memberNameRow}>
          <span className={styles.memberName}>{member.name}</span>
          {isMe && <span className={styles.meBadge}>나</span>}
        </div>
        <div className={styles.memberSubRow}>
          <span className={styles.memberSubText}>{member.completed} / {member.total}회 완료</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${member.rate}%`, background: color }} />
          </div>
        </div>
      </div>
      <span className={styles.rateText} style={{ color }}>{member.rate}%</span>
    </div>
  )
}

function RingChart({ rate }: { rate: number }) {
  const r = 38
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - rate / 100)
  return (
    <svg width="92" height="92" viewBox="0 0 92 92">
      <defs>
        <linearGradient id="partRingGrad" x1="0" y1="0" x2="92" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#46D7FF" />
          <stop offset="1" stopColor="#9B6BFF" />
        </linearGradient>
      </defs>
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--ring-track, rgba(255,255,255,0.08))" strokeWidth="9" />
      <circle cx="46" cy="46" r={r} fill="none" stroke="url(#partRingGrad)" strokeWidth="9"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 46 46)" />
      <image href="/synk-bolt.png" x="20" y="20" width="52" height="52" />
    </svg>
  )
}

export default function RoomParticipationPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const myUserId = useAuthStore((s) => s.user?.userId)
  const id = Number(roomId)

  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<ParticipationStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [room, setRoom] = useState<RoomDetail | null>(null)

  useEffect(() => {
    roomApi.getRoom(id).then((res) => setRoom(res.data)).catch(() => {})
  }, [id])

  const maxOffset = maxWeekOffset(room?.createdAt ?? room?.created_at)

  useEffect(() => {
    setIsLoading(true)
    setError(false)
    roomApi.getParticipation(id, weekOffset)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [id, weekOffset])

  function HeroBars() {
    if (!data || data.members.length === 0) return null
    const max = Math.max(...data.members.map((m) => m.rate), 1)
    return (
      <div className={styles.memberBars}>
        {data.members.map((m) => (
          <div key={m.userId} className={styles.memberBar}
            style={{ background: rankColor(m.rank), height: `${Math.max(14, Math.round((m.rate / max) * 38))}px` }} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <NavHeader title="주별 참여율" onBack={() => navigate(ROUTES.ROOM(id))} />

      <div className={styles.scroll}>

        {/* ── 주 네비게이터 ─────────────────────────────────────────────────── */}
        <div className={styles.weekNav}>
          <button
            className={styles.weekArrow}
            onClick={() => setWeekOffset((w) => Math.min(w + 1, maxOffset))}
            disabled={weekOffset >= maxOffset}
            aria-label="이전 주"
          >
            <ChevronLeft />
          </button>
          <div className={styles.weekLabel}>
            <span className={styles.weekLabelMain}>{formatWeekLabel(weekOffset)}</span>
            <span className={styles.weekLabelSub}>{formatDateRange(data?.startDate, data?.endDate)}</span>
          </div>
          <button
            className={styles.weekArrow}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            aria-label="다음 주"
          >
            <ChevronRight />
          </button>
        </div>

        {isLoading ? <Loading /> : error ? (
          <div className={styles.errorBox}>
            <p className={styles.emptyText}>데이터를 불러올 수 없어요</p>
            <p className={styles.errorSub}>백엔드 API가 아직 준비되지 않았을 수 있어요</p>
          </div>
        ) : !data ? null : (
          <>
            {/* 히어로 카드 */}
            <div className={styles.heroCard}>
              <div className={styles.heroTop}>
                <div className={styles.heroLeft}>
                  <span className={styles.heroLabel}>평균 참여율</span>
                  <span className={styles.heroRate}>{data.averageRate}%</span>
                  <span className={styles.heroMeta}>
                    {data.memberCount}명 · {data.missionCount}회 미션
                  </span>
                </div>
                <RingChart rate={data.averageRate} />
              </div>
            </div>

            {/* 멤버별 현황 */}
            <span className={styles.sectionTitle}>멤버별 현황</span>
            {data.members.length === 0 ? (
              <p className={styles.emptyText}>이번 주 참여 기록이 없어요</p>
            ) : (
              <div className={styles.memberList}>
                {data.members.map((m) => (
                  <MemberCard key={m.userId} member={m} isMe={m.userId === myUserId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
