import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './RoomAlbumPage.module.css'

/** "YYYY.MM.DD" → "YYYY-MM-DD" (URL 파라미터용) */
function toUrlDate(dotDate: string): string {
  return dotDate.replace(/\./g, '-')
}

export default function RoomAlbumPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId)

  const [albums, setAlbums]     = useState<AlbumItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    albumApi.getAlbums(numRoomId)
      .then((res) => setAlbums(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [numRoomId])

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

      {/* ── 서브타이틀 ──────────────────────────────────────────────────────── */}
      <p className={styles.subtitle}>우리의 소중한 추억들</p>

      {/* ── 목록 ────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <Loading />
      ) : albums.length === 0 ? (
        <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          아직 앨범이 없어요
        </p>
      ) : (
        <div className={styles.list}>
          {albums.map((entry) => (
            <button
              key={entry.date}
              className={styles.entry}
              onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, toUrlDate(entry.date)))}
            >
              {/* 썸네일 */}
              <div className={styles.thumb}>
                {entry.thumbnail
                  ? <img src={entry.thumbnail} alt={entry.date} className={styles.thumbImg} />
                  : <div className={styles.thumbPlaceholder} />
                }
              </div>

              {/* 정보 */}
              <div className={styles.info}>
                <span className={styles.date}>{entry.date}</span>
                <div className={styles.avatarStack}>
                  {entry.memberProfiles.slice(0, 5).map((p) => (
                    <img key={p.userId} src={p.profileImage ?? '/SYNK.jpeg'} alt="" className={styles.avatarBubble} />
                  ))}
                  {entry.memberProfiles.length > 5 && (
                    <span className={styles.avatarBubble}>+{entry.memberProfiles.length - 5}</span>
                  )}
                </div>
              </div>

              <span className={styles.arrow}>›</span>
            </button>
          ))}
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
