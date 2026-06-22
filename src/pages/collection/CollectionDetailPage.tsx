import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collectionApi } from '@/services/api/endpoints'
import type { CollectionDetailResponse, CollectionRecordItem } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './CollectionDetailPage.module.css'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

export default function CollectionDetailPage() {
  const { missionId }             = useParams<{ missionId: string }>()
  const [detail, setDetail]       = useState<CollectionDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)

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
      <NavHeader title="미션 상세" />

      <div className={styles.scroll}>
        {isLoading && (
          <p className={styles.empty}>불러오는 중...</p>
        )}

        {!isLoading && detail && (
          <>
            {/* ── 미션 설명 카드 ──────────────────────────────────────────────── */}
            <div className={styles.missionCard}>
              <div className={styles.missionAvatar}>
                <span className={styles.missionAvatarEmoji}>😊</span>
              </div>
              <div className={styles.missionText}>
                <span className={styles.missionTitle}>{detail.title}</span>
                {detail.description && (
                  <span className={styles.missionDesc}>{detail.description}</span>
                )}
              </div>
            </div>

            {/* ── 통계 카드 2개 ────────────────────────────────────────────────── */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>완료 횟수</span>
                <span className={styles.statValue}>{detail.completedTimes}<span className={styles.statUnit}>회</span></span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>마지막 완료</span>
                <span className={styles.statValueDate}>{detail.lastCompletedDate || '—'}</span>
              </div>
            </div>

            {/* ── 내 기록 ─────────────────────────────────────────────────────── */}
            <div className={styles.recordSection}>
              <h2 className={styles.sectionTitle}>
                내 기록
                {detail.records.length > 0 && (
                  <span className={styles.sectionCount}> · {detail.records.length}</span>
                )}
              </h2>
              {detail.records.length === 0 ? (
                <p className={styles.emptyRecords}>기록이 없어요</p>
              ) : (
                <div className={styles.photoGrid}>
                  {detail.records.map((r: CollectionRecordItem) => {
                    const video = toHttps(r.videoUrl)
                    return (
                      <button
                        key={r.recordId}
                        className={styles.photoCell}
                        onClick={() => video && setPlayingUrl(video)}
                        disabled={!video}
                      >
                        {video ? (
                          // 합쳐진 콜라주 썸네일 대신 본인 영상의 첫 프레임을 표시
                          <video
                            src={`${video}#t=0.1`}
                            className={styles.photo}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : r.thumbnail ? (
                          <img src={r.thumbnail} alt={r.date} className={styles.photo} />
                        ) : (
                          <div className={styles.photoPlaceholder} />
                        )}
                        {video && (
                          <span className={styles.playBadge}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        )}
                        <span className={styles.photoLabel}>{r.roomName} · {r.date.slice(5)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {!isLoading && !detail && (
          <p className={styles.empty}>미션 정보를 찾을 수 없어요</p>
        )}
      </div>

      {playingUrl && (
        <div className={styles.videoOverlay} onClick={() => setPlayingUrl(null)}>
          <button className={styles.videoClose} onClick={() => setPlayingUrl(null)} aria-label="닫기">✕</button>
          <video
            src={playingUrl}
            className={styles.videoPlayer}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
