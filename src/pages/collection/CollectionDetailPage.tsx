import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collectionApi } from '@/services/api/endpoints'
import type { CollectionDetailResponse, CollectionRecordItem } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './CollectionDetailPage.module.css'

export default function CollectionDetailPage() {
  const { missionId }             = useParams<{ missionId: string }>()
  const [detail, setDetail]       = useState<CollectionDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!missionId) return
    collectionApi
      .getMissionDetail(Number(missionId))
      .then((res) => setDetail(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [missionId])

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="미션 상세" />

      <div className={styles.scroll}>
        {isLoading && (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            불러오는 중...
          </p>
        )}

        {!isLoading && detail && (
          <>
            {/* ── 미션 설명 카드 ──────────────────────────────────────────────── */}
            <div className={styles.missionCard}>
              <div className={styles.missionAvatar}>
                <span className={styles.missionAvatarText}>🎯</span>
              </div>
              <div className={styles.missionText}>
                <span className={styles.missionTitle}>{detail.title}</span>
                <span className={styles.missionDesc}>{detail.description}</span>
              </div>
            </div>

            {/* ── 통계 ────────────────────────────────────────────────────────── */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>완료 횟수</span>
                <span className={styles.statValue}>{detail.completedTimes}회</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statLabel}>마지막 완료</span>
                <span className={styles.statValue}>{detail.lastCompletedDate || '—'}</span>
              </div>
            </div>

            {/* ── 내 기록 ─────────────────────────────────────────────────────── */}
            <div>
              <h2 className={styles.sectionTitle}>내 기록</h2>
              {detail.records.length === 0 ? (
                <p style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  기록이 없어요
                </p>
              ) : (
                <div className={styles.photoGrid}>
                  {detail.records.map((r: CollectionRecordItem) => (
                    <div key={r.recordId} className={styles.photoCell}>
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt={r.date} className={styles.photo} />
                      ) : (
                        <div className={styles.photo} style={{ background: 'var(--color-surface-2)' }} />
                      )}
                      <span className={styles.photoLabel}>{r.roomName} · {r.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!isLoading && !detail && (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            미션 정보를 찾을 수 없어요
          </p>
        )}
      </div>
    </div>
  )
}
