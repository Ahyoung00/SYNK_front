import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import type { CollageItem, RoomDetail } from '@/types'
import { missionGradient } from '@/utils/missionVisual'
import styles from './SynkLogDetailPage.module.css'


export default function SynkLogDetailPage() {
  const { roomId, date } = useParams<{ roomId: string; date: string }>()
  const navigate    = useNavigate()
  const location    = useLocation()
  const setActive   = useMissionStore((s) => s.setActive)
  const previewUrl  = useMissionStore((s) => s.previewUrl)
  const myUser      = useAuthStore((s) => s.user)
  const numRoomId   = Number(roomId)
  const missionRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const [collages, setCollages] = useState<CollageItem[]>([])
  const [room, setRoom]         = useState<RoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!date) return
    Promise.all([
      albumApi.getCollages(numRoomId, date),
      roomApi.getRoom(numRoomId),
    ])
      .then(([collageRes, roomRes]) => {
        const sorted = [...collageRes.data].sort(
          (a, b) => new Date(b.missionStartAt ?? 0).getTime() - new Date(a.missionStartAt ?? 0).getTime()
        )
        setCollages(sorted)
        setRoom(roomRes.data)

        // 썸네일 URL로 해당 미션 카드 스크롤
        const targetThumb = (location.state as { scrollToThumbnail?: string } | null)?.scrollToThumbnail
        if (targetThumb) {
          const target = sorted.find((c) => c.thumbnail === targetThumb) ?? sorted[0]
          if (target) {
            requestAnimationFrame(() => {
              missionRefs.current[target.missionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [numRoomId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleViewCollage(item: CollageItem) {
    setActive({
      mission: {
        id:                  item.missionId,
        room_id:             numRoomId,
        mission_template_id: 0,
        type:                'VIDEO',
        status:              'ACTIVE',
        targeted_at:         item.missionStartAt ?? date ?? '',
        deadline:            item.missionStartAt ?? date ?? '',
        created_at:          item.missionStartAt ?? date ?? '',
        template: { id: 0, title: item.missionTitle },
      },
      room: {
        id:                  numRoomId,
        name:                room?.name ?? '',
        code:                '',
        thumbnail:           room?.thumbnail ?? null,
        owner_id:            0,
        max_members:         item.participants.length,
        current_members:     item.participants.length,
        daily_mission_count: 1,
        mission_start_time:  '',
        mission_end_time:    '',
        created_at:          null,
      },
      seconds_left: 0,
      participations: item.participants.map((p) => {
        const isMe = myUser && p.userId === myUser.userId
        const effectiveVideoUrl = (isMe && p.state === 'done' && previewUrl)
          ? previewUrl
          : p.videoUrl
        return {
          user: { userId: p.userId, name: p.name, profileImage: p.profileImage },
          state: p.state,
          submission: p.state === 'done' ? {
            id: 0, user_id: p.userId, room_id: numRoomId, mission_id: item.missionId,
            video_url: effectiveVideoUrl ?? '', status: 'SUBMITTED' as const,
            submitted_at: p.submittedAt,
          } : undefined,
        }
      }),
    })
    navigate(ROUTES.MISSION_RESULT(item.missionId), { state: { returnTo: 'album', roomId: numRoomId, date } })
  }

  function formatTime(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  if (isLoading) return (
    <div className={styles.page}>
      <PageHeader date={date ?? ''} onBack={() => navigate(-1)} />
      <div className={styles.loadingWrap}>불러오는 중...</div>
    </div>
  )

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = date === todayStr
  const isEmpty = collages.length === 0

  return (
    <div className={styles.page}>
      <PageHeader date={date ?? ''} onBack={() => navigate(-1)} />

      <div className={styles.scroll}>

        {/* ── 방 정보 행 ────────────────────────────────────────────────── */}
        {room && !isEmpty && (
          <div className={styles.roomRow}>
            <div className={styles.roomThumb}>
              {room.thumbnail
                ? <img src={room.thumbnail} alt={room.name} className={styles.roomThumbImg} />
                : <span className={styles.roomThumbEmoji}>🏠</span>
              }
            </div>
            <span className={styles.roomName}>{room.name}</span>
            <span className={styles.roomChip}>
              미션 {collages.length}
            </span>
          </div>
        )}

        {/* ── 미션이 없는 날: 빈 상태 ───────────────────────────────────── */}
        {isEmpty && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIconWrap}>
              <CameraIcon />
            </div>
            <p className={styles.emptyTitle}>아직 담은 순간이 없어요</p>
            <p className={styles.emptyDesc}>
              {isToday
                ? <>오늘 미션이 도착하면<br />여기에 콜라주가 모여요.</>
                : '이 날은 진행된 미션이 없어요.'}
            </p>
            {isToday && (
              <span className={styles.emptyBadge}>
                <span className={styles.emptyDot} />
                미션 대기 중
              </span>
            )}
          </div>
        )}

        {/* ── 미션별 콜라주 카드 ─────────────────────────────────────────── */}
        {collages.map((item) => (
          <div key={item.missionId} className={styles.missionCard} ref={(el) => { missionRefs.current[item.missionId] = el }}>
            {/* 미션 헤더 */}
            <div className={styles.missionHeader}>
              <div className={styles.missionIconWrap} style={{ background: missionGradient(item.missionTitle) }}>
                <img src="/synk-bolt.png" alt="" className={styles.missionEmoji} />
              </div>
              <div className={styles.missionInfo}>
                <span className={styles.missionTitle}>{item.missionTitle}</span>
                <span className={styles.missionMeta}>
                  {formatTime(item.missionStartAt)} · {item.participants.length}명 참여
                </span>
              </div>
              <button
                className={styles.collageChip}
                onClick={() => handleViewCollage(item)}
              >
                미션 보기
              </button>
            </div>

            {/* 콜라주 썸네일 — thumbnail 있으면 정적 이미지, 없으면 이니셜 폴백 */}
            {item.thumbnail ? (
              <div className={styles.collageThumbnailWrap}>
                <img
                  src={item.thumbnail}
                  alt={item.missionTitle}
                  className={styles.collageThumbnailImg}
                />
              </div>
            ) : (
              <div className={styles.photoGrid}>
                {item.participants.map((p) => (
                  <div key={p.userId} className={styles.photoCell}>
                    <div className={[styles.photoPlaceholder, p.state === 'done' ? styles.photoPlaceholderDone : ''].join(' ')}>
                      <span className={styles.photoInitial}>{p.name.charAt(0)}</span>
                    </div>
                    <span className={styles.photoName}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}


      </div>
    </div>
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

function PageHeader({ date, onBack }: { date: string; onBack: () => void }) {
  return (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
        <BackIcon />
      </button>
      <h1 className={styles.headerTitle}>{date}</h1>
      <div className={styles.headerRight} />
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
