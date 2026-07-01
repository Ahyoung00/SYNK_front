import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem, AlbumMemberProfile, RoomDetail, CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './RoomAlbumPage.module.css'

function toUrlDate(dotDate: string): string {
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

export default function RoomAlbumPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId)

  const now       = new Date()
  const todayDot  = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const todayDash = todayDot.replace(/\./g, '-')

  const [albums, setAlbums]               = useState<AlbumItem[]>([])
  const [room, setRoom]                   = useState<RoomDetail | null>(null)
  const [todayCollages, setTodayCollages] = useState<CollageItem[]>([])
  const [isLoading, setIsLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      albumApi.getAlbums(numRoomId),
      roomApi.getRoom(numRoomId),
    ])
      .then(([albumRes, roomRes]) => {
        setAlbums(albumRes.data)
        setRoom(roomRes.data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))

    // 오늘의 콜라주 목록으로 오늘 콘텐츠 판단 + 미션별 칸 구성 (미션 없으면 404)
    albumApi.getCollages(numRoomId, todayDash)
      .then((res) => {
        const sorted = [...(res.data ?? [])].sort(
          (a, b) => new Date(b.missionStartAt ?? 0).getTime() - new Date(a.missionStartAt ?? 0).getTime()
        )
        setTodayCollages(sorted)
      })
      .catch(() => setTodayCollages([]))
  }, [numRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayHasContent = todayCollages.length > 0
  const past       = albums
    .filter((a) => a.date !== todayDot)
    .sort((a, b) => b.date.localeCompare(a.date))
  const dayCount   = past.length + (todayHasContent ? 1 : 0)

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
      ) : (
        <div className={styles.scroll}>
          {/* ── 서브타이틀 행 ─────────────────────────────────────────────── */}
          <div className={styles.subtitleRow}>
            <span className={styles.subtitle}>우리의 소중한 순간들</span>
            <span className={styles.countChip}>{dayCount}일</span>
          </div>

          {/* ── 오늘 ──────────────────────────────────────────────────────── */}
          <p className={styles.sectionLabel}>오늘 · {todayDash}</p>
          {todayHasContent ? (
            <div className={styles.list}>
              <AlbumEntryRow
                date={todayDot}
                thumbnail={todayCollages.find((c) => c.thumbnail)?.thumbnail ?? null}
                memberProfiles={dedupeMemberProfiles(todayCollages)}
                roomName={room?.name ?? ''}
                onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, todayDash))}
              />
            </div>
          ) : (
            <div className={styles.todayEmpty}>
              <p className={styles.todayEmptyTitle}>아직 담은 순간이 없어요</p>
              <p className={styles.todayEmptyDesc}>
                오늘 미션이 도착하면<br />여기에 콜라주가 모여요.
              </p>
              <span className={styles.todayEmptyBadge}>
                <span className={styles.todayEmptyDot} />
                미션 대기 중
              </span>
            </div>
          )}

          {/* ── 지난 날들 ─────────────────────────────────────────────────── */}
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
                    roomName={room?.name ?? ''}
                    onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, toUrlDate(entry.date)))}
                  />
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


function AlbumEntryRow({
  date, thumbnail, memberProfiles, roomName, onClick,
}: {
  date: string
  thumbnail: string | null
  memberProfiles: AlbumMemberProfile[]
  roomName: string
  onClick: () => void
}) {
  return (
    <button className={styles.entry} onClick={onClick}>
      {/* 썸네일 */}
      <div className={styles.mosaic}>
        {thumbnail ? (
          <img src={toHttps(thumbnail)!} alt={date} className={styles.mosaicThumb} />
        ) : (
          <>
            {[0,1,2,3].map((i) => (
              <div key={i} className={styles.mosaicCell}>
                {memberProfiles[i]?.profileImage && (
                  <img src={memberProfiles[i].profileImage!} alt="" className={styles.mosaicCellImg} />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* 정보 */}
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
          <span className={styles.entryRoomName}>{roomName}</span>
        </div>
      </div>

      <span className={styles.arrow}>›</span>
    </button>
  )
}
