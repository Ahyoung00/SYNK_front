import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { collectionApi } from '@/services/api/endpoints'
import type { CollectionListResponse, CollectionMissionItem } from '@/types'
import AppHeader from '@/components/layout/AppHeader'
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
      <AppHeader subtitle="내가 완료한 미션" />

      <div className={styles.scroll}>
        {/* ── 수집률 카드 ──────────────────────────────────────────────────────── */}
        <div className={styles.statsCard}>
          <span className={styles.statsLabel}>수집률</span>
          <div className={styles.statsRow}>
            <span className={styles.statsRate}>
              {isLoading ? '...' : `${data?.completionRate ?? 0}%`}
            </span>
            <span className={styles.statsCount}>
              {isLoading ? '—' : `${data?.completedCount ?? 0} / ${data?.totalCount ?? 0} 미션 완료`}
            </span>
          </div>
        </div>

        {/* ── 미션 목록 ──────────────────────────────────────────────────────── */}
        <div className={styles.missionList}>
          {isLoading ? (
            <p style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              불러오는 중...
            </p>
          ) : !data || data.missions.length === 0 ? (
            <p style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              아직 완료한 미션이 없어요
            </p>
          ) : (
            data.missions.map((mission: CollectionMissionItem) => (
              <button
                key={mission.missionId}
                className={styles.missionCard}
                onClick={() => navigate(ROUTES.COLLECTION_DETAIL(mission.missionId))}
              >
                {/* 썸네일 — URL 있으면 이미지, 없으면 그라디언트 */}
                {mission.thumbnail ? (
                  <img src={mission.thumbnail} alt={mission.title} className={styles.thumbnail} />
                ) : (
                  <div className={styles.thumbnail} style={{ background: gradient(mission.missionId) }} />
                )}
                <div className={styles.missionInfo}>
                  <span className={styles.missionTitle}>{mission.title}</span>
                  <span className={styles.missionMeta}>완료 횟수 {mission.completedTimes}회</span>
                  <span className={styles.missionMeta}>최근 {mission.lastCompletedDate}</span>
                </div>
                <span className={styles.arrow}>›</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
