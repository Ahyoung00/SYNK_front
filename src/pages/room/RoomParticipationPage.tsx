import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi } from '@/services/api/endpoints'
import type { ParticipationPeriod, ParticipationStatsResponse, ParticipationMemberStat } from '@/types'
import { useAuthStore } from '@/store/authStore'
import NavHeader from '@/components/layout/NavHeader'
import Loading from '@/components/ui/Loading'
import styles from './RoomParticipationPage.module.css'

const PERIODS: { key: ParticipationPeriod; label: string }[] = [
  { key: 'month',     label: '이번 달' },
  { key: 'lastMonth', label: '지난 달' },
  { key: 'all',       label: '전체' },
]

// 순위별 색상
const RANK_COLORS = ['#4ade80', '#4ade80', '#4ade80', '#8B5CF6', '#6E8BFF', '#FF9A3C', '#FF9A3C']
function rankColor(rank: number) {
  return RANK_COLORS[Math.min(rank - 1, RANK_COLORS.length - 1)]
}

// 순위 배지
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className={styles.rankBadge}>🥇</span>
  if (rank === 2) return <span className={styles.rankBadge}>🥈</span>
  if (rank === 3) return <span className={styles.rankBadge}>🥉</span>
  return <span className={styles.rankNum}>{rank}</span>
}

// 아바타 배경색
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
            <div
              className={styles.progressFill}
              style={{ width: `${member.rate}%`, background: color }}
            />
          </div>
        </div>
      </div>

      <span className={styles.rateText} style={{ color }}>{member.rate}%</span>
    </div>
  )
}

export default function RoomParticipationPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const myUserId = useAuthStore((s) => s.user?.userId)
  const id = Number(roomId)

  const [period, setPeriod] = useState<ParticipationPeriod>('month')
  const [data, setData] = useState<ParticipationStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    roomApi.getParticipation(id, period)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id, period])

  // 히어로 카드 상단 색상 바 — 멤버별 참여율 높이로 표현
  function HeroBars() {
    if (!data || data.members.length === 0) return null
    const max = Math.max(...data.members.map((m) => m.rate), 1)
    return (
      <div className={styles.memberBars}>
        {data.members.map((m) => (
          <div
            key={m.userId}
            className={styles.memberBar}
            style={{
              background: rankColor(m.rank),
              height: `${Math.max(14, Math.round((m.rate / max) * 38))}px`,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <NavHeader title="참여율" onBack={() => navigate(ROUTES.ROOM(id))} />

      <div className={styles.scroll}>
        {/* 기간 탭 */}
        <div className={styles.tabBar}>
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.tabBtn} ${period === key ? styles.tabActive : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? <Loading /> : !data ? (
          <p className={styles.emptyText}>데이터를 불러올 수 없어요</p>
        ) : (
          <>
            {/* 히어로 카드 */}
            <div className={styles.heroCard}>
              <div className={styles.heroTop}>
                <div className={styles.heroLeft}>
                  <span className={styles.heroLabel}>평균 참여율</span>
                  <span className={styles.heroRate}>{data.averageRate}%</span>
                  <span className={styles.heroMeta}>
                    {data.memberCount}명 · {PERIODS.find((p) => p.key === period)?.label} {data.missionCount}회 미션
                  </span>
                </div>
                <RingChart rate={data.averageRate} />
              </div>
              <HeroBars />
            </div>

            {/* 멤버별 현황 */}
            <span className={styles.sectionTitle}>멤버별 현황</span>
            {data.members.length === 0 ? (
              <p className={styles.emptyText}>참여 기록이 없어요</p>
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
      <circle
        cx="46" cy="46" r={r}
        fill="none"
        stroke="url(#partRingGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 46 46)"
      />
      <image href="/synk-bolt.png" x="20" y="20" width="52" height="52" />
    </svg>
  )
}
