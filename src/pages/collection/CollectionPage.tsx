import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { collectionApi } from '@/services/api/endpoints'
import type { CollectionListResponse, CollectionMissionItem } from '@/types'
import AppHeader from '@/components/layout/AppHeader'
import Loading from '@/components/ui/Loading'
import { missionEmoji } from '@/utils/missionVisual'
import styles from './CollectionPage.module.css'

// thumbnail 없을 때 미션 ID 기반 그라디언트 폴백
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
]
const gradient = (id: number) => GRADIENTS[(id - 1) % GRADIENTS.length]

function RingChart({ rate }: { rate: number }) {
  const r = 38
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - rate / 100)
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className={styles.ring}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="92" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#46D7FF" />
            <stop offset="1" stopColor="#9B6BFF" />
          </linearGradient>
        </defs>
        <circle cx="46" cy="46" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="9" />
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke="url(#ringGrad)"
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

export default function CollectionPage() {
  const navigate = useNavigate()
  const [data, setData]         = useState<CollectionListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    collectionApi
      .getMyCollection()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <AppHeader subtitle="내가 모은 미션 도감" />

      <div className={styles.scroll}>
        {/* ── 수집률 카드 ──────────────────────────────────────────────────────── */}
        <div className={styles.statsCard}>
          <div className={styles.statsInner}>
            <div className={styles.statsLeft}>
              <span className={styles.statsLabel}>수집률</span>
              <span className={styles.statsRate}>
                {isLoading ? '...' : `${data?.completionRate ?? 0}%`}
              </span>
              <span className={styles.statsCount}>
                {isLoading ? '—' : `${data?.completedCount ?? 0} / ${data?.totalCount ?? 0} 미션 완료`}
              </span>
            </div>
            <RingChart rate={isLoading ? 0 : (data?.completionRate ?? 0)} />
          </div>
        </div>

        {/* ── 미션 목록 ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <Loading />
        ) : (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionHeaderIcon}>⚡</span>
              <span className={styles.sectionHeaderTitle}>완료한 미션</span>
            </div>
            <div className={styles.missionList}>
              {!data || data.missions.length === 0 ? (
                <p className={styles.emptyText}>아직 완료한 미션이 없어요</p>
              ) : (
                data.missions.map((mission: CollectionMissionItem) => (
                  <button
                    key={mission.missionId}
                    className={styles.missionCard}
                    onClick={() => navigate(ROUTES.COLLECTION_DETAIL(mission.missionId))}
                  >
                    <div className={styles.thumbnail} style={{ background: gradient(mission.missionId) }}>
                      <span className={styles.thumbnailEmoji}>{missionEmoji(mission.title)}</span>
                    </div>
                    <div className={styles.missionInfo}>
                      <span className={styles.missionTitle}>{mission.title}</span>
                      <span className={styles.missionMeta}>최근 {mission.lastCompletedDate}</span>
                    </div>
                    <div className={styles.completeBadge}>
                      <span className={styles.completeCount}>완료 {mission.completedTimes}회</span>
                      <span className={styles.completeCheck}>✓</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
