import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem, CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './SynklogDateSelectPage.module.css'

function toUrlDate(dotDate: string) {
  return dotDate.replace(/\./g, '-')
}

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

export default function SynklogDateSelectPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId)

  const now       = new Date()
  const todayDot  = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const todayDash = todayDot.replace(/\./g, '-')

  const [albums, setAlbums]               = useState<AlbumItem[]>([])
  const [todayCollages, setTodayCollages] = useState<CollageItem[]>([])
  const [isLoading, setIsLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      albumApi.getAlbums(numRoomId),
      albumApi.getCollages(numRoomId, todayDash).catch(() => ({ data: [] as CollageItem[] })),
    ])
      .then(([albumRes, todayRes]) => {
        setAlbums(albumRes.data)
        setTodayCollages(todayRes.data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [numRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  function goCreate(date: string) {
    navigate(ROUTES.SYNKLOG_CREATE(numRoomId), { state: { date } })
  }

  const todayCompleted = todayCollages.filter((c) => c.status === 'COMPLETED')
  const todayThumb     = toHttps(todayCollages.find((c) => c.thumbnail)?.thumbnail ?? null)

  const past = albums
    .filter((a) => a.date !== todayDot)
    .sort((a, b) => b.date.localeCompare(a.date))

  type GridEntry = {
    isToday: boolean
    date: string
    count: number | null
    thumb: string | null
  }

  const entries: GridEntry[] = [
    { isToday: true,  date: todayDot, count: todayCompleted.length, thumb: todayThumb },
    ...past.map((a) => ({
      isToday: false,
      date:    a.date,
      count:   null,
      thumb:   toHttps(a.thumbnail),
    })),
  ]

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <BackIcon />
        </button>
        <h1 className={styles.headerTitle}>날짜 선택</h1>
        <div className={styles.headerRight} />
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <div className={styles.scroll}>
          {/* 타이틀 */}
          <div className={styles.titleBlock}>
            <p className={styles.title}>SYNKLOG로 남길<br />날짜를 골라주세요</p>
            <div className={styles.hint}>
              <span className={styles.hintLine} />
              <span>SYNKLOG가 없는 날만 표시돼요</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className={styles.empty}>아직 기록된 날이 없어요</div>
          ) : (
            <div className={styles.grid}>
              {entries.map((entry) => {
                const urlDate = entry.isToday ? todayDash : toUrlDate(entry.date)

                return (
                  <button
                    key={entry.date}
                    className={[styles.card, entry.isToday ? styles.cardToday : ''].join(' ')}
                    onClick={() => goCreate(urlDate)}
                  >
                    {/* 썸네일 */}
                    <div className={styles.thumb}>
                      {entry.thumb ? (
                        <img src={entry.thumb} alt={entry.date} className={styles.thumbImg} />
                      ) : (
                        <span className={styles.thumbPlaceholder}>
                          <ImageIcon />
                        </span>
                      )}

                      {entry.isToday && <span className={styles.todayBadge}>오늘</span>}
                      {entry.count !== null && (
                        <span className={styles.countBadge}>
                          <FilmIcon />
                          {entry.count}
                        </span>
                      )}
                    </div>

                    {/* 날짜·개수 */}
                    <div className={styles.cardInfo}>
                      <span className={styles.cardDate}>{entry.date}</span>
                      {entry.count !== null && (
                        <span className={styles.cardCount}>콜라주 {entry.count}개</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
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

function ImageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function FilmIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
    </svg>
  )
}
