import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { AlbumItem, RoomDetail, CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './RoomAlbumPage.module.css'

function toUrlDate(dotDate: string): string {
  return dotDate.replace(/\./g, '-')
}

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
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
      .then((res) => setTodayCollages(res.data ?? []))
      .catch(() => setTodayCollages([]))
  }, [numRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayHasContent = todayCollages.length > 0
  const past       = albums.filter((a) => a.date !== todayDot)
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
            <button
              className={styles.hero}
              onClick={() => navigate(ROUTES.ROOM_SYNKLOG(numRoomId, todayDash))}
            >
              <div className={styles.todayGrid}>
                {todayCollages.map((c, i) => {
                  const video = toHttps(c.collageVideoUrl)
                  return (
                    <div key={c.missionId} className={styles.todayCell}>
                      {video ? (
                        <video
                          src={`${video}#t=0.1`}
                          className={styles.heroCellImg}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className={styles.todayCellPending}>처리 중</div>
                      )}
                      {i === 0 && (
                        <div className={styles.heroCellScrim}>
                          <span className={styles.heroDate}>{todayDot}</span>
                          <span className={styles.synklogBadge}>SYNKLOG</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </button>
          ) : (
            <div className={styles.todayEmpty}>
              <div className={styles.todayEmptyIcon}>
                <CameraIcon />
              </div>
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

function CameraIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h3l2-2h8l2 2h3v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
