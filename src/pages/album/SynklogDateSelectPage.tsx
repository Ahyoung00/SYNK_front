import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem, AlbumMemberProfile, CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './RoomAlbumPage.module.css'

function toUrlDate(dotDate: string) {
  return dotDate.replace(/\./g, '-')
}

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

function dedupeMemberProfiles(collages: CollageItem[]): AlbumMemberProfile[] {
  const seen = new Map<number, AlbumMemberProfile>()
  for (const c of collages) {
    for (const p of c.participants) {
      if (!seen.has(p.userId)) seen.set(p.userId, { userId: p.userId, profileImage: p.profileImage })
    }
  }
  return [...seen.values()]
}

export default function SynklogDateSelectPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId)

  const now      = new Date()
  const todayDot = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const todayDash = todayDot.replace(/\./g, '-')

  const [albums, setAlbums]             = useState<AlbumItem[]>([])
  const [todayCollages, setTodayCollages] = useState<CollageItem[]>([])
  const [isLoading, setIsLoading]       = useState(true)

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

  const todayHasContent = todayCollages.filter((c) => c.status === 'COMPLETED').length > 0
  const past = albums
    .filter((a) => a.date !== todayDot)
    .sort((a, b) => b.date.localeCompare(a.date))

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
          <div className={styles.subtitleRow}>
            <span className={styles.subtitle}>Synklog로 남길 날짜를 골라주세요</span>
          </div>

          {/* 오늘 */}
          <p className={styles.sectionLabel}>오늘 · {todayDash}</p>
          {todayHasContent ? (
            <div className={styles.list}>
              <AlbumEntryRow
                date={todayDot}
                thumbnail={todayCollages.find((c) => c.thumbnail)?.thumbnail ?? null}
                memberProfiles={dedupeMemberProfiles(todayCollages)}
                onClick={() => goCreate(todayDash)}
              />
            </div>
          ) : (
            <div className={styles.todayEmpty}>
              <p className={styles.todayEmptyTitle}>아직 완료된 미션이 없어요</p>
              <p className={styles.todayEmptyDesc}>
                오늘 미션이 완료되면<br />Synklog를 만들 수 있어요.
              </p>
            </div>
          )}

          {/* 지난 날들 */}
          {past.length > 0 && (
            <>
              <p className={styles.sectionLabel}>지난 날들</p>
              <div className={styles.list}>
                {past.map((entry) => (
                  <AlbumEntryRow
                    key={entry.date}
                    date={entry.date}
                    thumbnail={entry.thumbnail}
                    memberProfiles={entry.memberProfiles}
                    onClick={() => goCreate(toUrlDate(entry.date))}
                  />
                ))}
              </div>
            </>
          )}

          {!todayHasContent && past.length === 0 && (
            <div className={styles.empty}>아직 기록된 날이 없어요</div>
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

function AlbumEntryRow({ date, thumbnail, memberProfiles, onClick }: {
  date: string
  thumbnail: string | null
  memberProfiles: AlbumMemberProfile[]
  onClick: () => void
}) {
  return (
    <button className={styles.entry} onClick={onClick}>
      <div className={styles.mosaic}>
        {thumbnail ? (
          <img src={toHttps(thumbnail)!} alt={date} className={styles.mosaicThumb} />
        ) : (
          [0,1,2,3].map((i) => (
            <div key={i} className={styles.mosaicCell}>
              {memberProfiles[i]?.profileImage && (
                <img src={memberProfiles[i].profileImage!} alt="" className={styles.mosaicCellImg} />
              )}
            </div>
          ))
        )}
      </div>
      <div className={styles.entryInfo}>
        <span className={styles.entryDate}>{date}</span>
        <div className={styles.entryMeta}>
          <div className={styles.avatarStack}>
            {memberProfiles.slice(0, 3).map((p) => (
              p.profileImage
                ? <img key={p.userId} src={p.profileImage} alt="" className={styles.avatarBubble} />
                : <div key={p.userId} className={styles.avatarBubble} />
            ))}
          </div>
        </div>
      </div>
      <span className={styles.arrow}>›</span>
    </button>
  )
}
