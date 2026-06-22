import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem, RoomDetail } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './RoomAlbumPage.module.css'

function toUrlDate(dotDate: string): string {
  return dotDate.replace(/\./g, '-')
}

export default function RoomAlbumPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId)

  const [albums, setAlbums]     = useState<AlbumItem[]>([])
  const [room, setRoom]         = useState<RoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      albumApi.getAlbums(numRoomId),
      roomApi.getRoom(numRoomId),
    ])
      .then(([albumRes, roomRes]) => {
        // 오늘 날짜는 앨범에 노출하지 않음 (지난 날만 표시)
        const now = new Date()
        const todayDot = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
        setAlbums(albumRes.data.filter((a) => a.date !== todayDot))
        setRoom(roomRes.data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [numRoomId])

  const latest = albums[0] ?? null
  const past   = albums.slice(1)

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <BackIcon />
        </button>
        <h1 className={styles.headerTitle}>앨범</h1>
        <div className={styles.headerRight} />
      </div>

      {isLoading ? (
        <Loading />
      ) : albums.length === 0 ? (
        <div className={styles.empty}>아직 앨범이 없어요 🌱</div>
      ) : (
        <div className={styles.scroll}>
          {/* ── 서브타이틀 행 ─────────────────────────────────────────────── */}
          <div className={styles.subtitleRow}>
            <span className={styles.subtitle}>우리의 소중한 순간들</span>
            <span className={styles.countChip}>{albums.length}일</span>
          </div>

          {/* ── 히어로: 최신 앨범 ─────────────────────────────────────────── */}
          {latest && (
            <button
              className={styles.hero}
              onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, toUrlDate(latest.date)))}
            >
              {/* 사진 그리드 영역 */}
              <div className={styles.heroGrid}>
                <div className={[styles.heroCell, styles.heroCellMain].join(' ')}>
                  {latest.thumbnail
                    ? <img src={latest.thumbnail} alt={latest.date} className={styles.heroCellImg} />
                    : null
                  }
                  <div className={styles.heroCellScrim}>
                    <span className={styles.heroDate}>{latest.date}</span>
                    <span className={styles.synklogBadge}>SYNKLOG</span>
                  </div>
                </div>
                <div className={styles.heroCellSide}>
                  <div className={[styles.heroCell, styles.heroCellSm].join(' ')} />
                  <div className={[styles.heroCell, styles.heroCellSm, styles.heroCellDark].join(' ')}>
                    <div className={styles.playBtn}>▶</div>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* ── 지난 날들 ─────────────────────────────────────────────────── */}
          {past.length > 0 && (
            <>
              <p className={styles.sectionLabel}>지난 날들</p>
              <div className={styles.list}>
                {past.map((entry) => (
                  <button
                    key={entry.date}
                    className={styles.entry}
                    onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, toUrlDate(entry.date)))}
                  >
                    {/* 모자이크 썸네일 */}
                    <div className={styles.mosaic}>
                      {[0,1,2,3].map((i) => (
                        <div key={i} className={styles.mosaicCell} />
                      ))}
                      {entry.memberProfiles.length > 4 && (
                        <div className={styles.mosaicMore}>+{entry.memberProfiles.length - 4}</div>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className={styles.entryInfo}>
                      <span className={styles.entryDate}>{entry.date}</span>
                      <div className={styles.entryMeta}>
                        <div className={styles.avatarStack}>
                          {entry.memberProfiles.slice(0, 3).map((p) => (
                            p.profileImage
                              ? <img key={p.userId} src={p.profileImage} alt="" className={styles.avatarBubble} />
                              : <div key={p.userId} className={styles.avatarBubble} />
                          ))}
                        </div>
                        <span className={styles.entryRoomName}>{room?.name ?? ''}</span>
                      </div>
                    </div>

                    <span className={styles.arrow}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}
