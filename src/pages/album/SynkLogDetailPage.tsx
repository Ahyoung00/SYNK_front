import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import type { CollageItem, SynklogDetailResponse, RoomDetail } from '@/types'
import styles from './SynkLogDetailPage.module.css'


export default function SynkLogDetailPage() {
  const { roomId, date } = useParams<{ roomId: string; date: string }>()
  const navigate    = useNavigate()
  const setActive   = useMissionStore((s) => s.setActive)
  const previewUrl  = useMissionStore((s) => s.previewUrl)
  const myUser      = useAuthStore((s) => s.user)
  const numRoomId   = Number(roomId)

  const [collages, setCollages]         = useState<CollageItem[]>([])
  const [synklog, setSynklog]           = useState<SynklogDetailResponse | null>(null)
  const [synklogMissing, setSynklogMissing] = useState(false)
  const [room, setRoom]                 = useState<RoomDetail | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [creatingLog, setCreatingLog]   = useState(false)

  useEffect(() => {
    if (!date) return
    Promise.all([
      albumApi.getCollages(numRoomId, date),
      roomApi.getRoom(numRoomId),
    ])
      .then(([collageRes, roomRes]) => {
        setCollages(collageRes.data)
        setRoom(roomRes.data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))

    albumApi.getSynklog(numRoomId, date)
      .then((res) => setSynklog(res.data))
      .catch(() => setSynklogMissing(true))
  }, [numRoomId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateSynklog() {
    if (creatingLog) return
    setCreatingLog(true)
    try {
      await albumApi.createSynklog(numRoomId, date!)
      const res = await albumApi.getSynklog(numRoomId, date!)
      setSynklog(res.data)
      setSynklogMissing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setCreatingLog(false)
    }
  }

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
    navigate(ROUTES.MISSION_RESULT(item.missionId), { state: { returnTo: 'album', roomId: numRoomId } })
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

  return (
    <div className={styles.page}>
      <PageHeader date={date ?? ''} onBack={() => navigate(-1)} />

      <div className={styles.scroll}>

        {/* ── 방 정보 행 ────────────────────────────────────────────────── */}
        {room && (
          <div className={styles.roomRow}>
            <div className={styles.roomThumb}>
              {room.thumbnail
                ? <img src={room.thumbnail} alt={room.name} className={styles.roomThumbImg} />
                : <span className={styles.roomThumbEmoji}>🏠</span>
              }
            </div>
            <span className={styles.roomName}>{room.name}</span>
            <span className={styles.roomChip}>
              미션 {collages.length} · 콜라주 {collages.filter(c => c.collageVideoUrl).length}
            </span>
          </div>
        )}

        {/* ── 미션별 콜라주 카드 ─────────────────────────────────────────── */}
        {collages.map((item) => (
          <div key={item.missionId} className={styles.missionCard}>
            {/* 미션 헤더 */}
            <div className={styles.missionHeader}>
              <div className={styles.missionIconWrap}>
                <span className={styles.missionEmoji}>⚡</span>
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
                콜라주
              </button>
            </div>

            {/* 참여자 포토 그리드 */}
            <div className={styles.photoGrid}>
              {item.participants.map((p) => (
                <div key={p.userId} className={styles.photoCell}>
                  {p.videoUrl
                    ? <video src={p.videoUrl} className={styles.photo} muted playsInline />
                    : <div className={styles.photoPlaceholder} />
                  }
                  <span className={styles.photoName}>{p.name}</span>
                </div>
              ))}
            </div>

          </div>
        ))}

        {/* ── SYNKLOG 섹션 ──────────────────────────────────────────────── */}
        <p className={styles.sectionLabel}>오늘의 SYNKLOG</p>

        <div className={styles.synklogCard}>
          {synklogMissing && (
            <div className={styles.synklogEmpty}>
              <div className={styles.synklogIconWrap}>
                <span className={styles.synklogIcon}>📹</span>
              </div>
              <p className={styles.synklogEmptyTitle}>아직 SYNKLOG가 없어요</p>
              <p className={styles.synklogEmptyDesc}>
                오늘의 콜라주를 짧은 영상으로<br />자동으로 만들어 드려요.
              </p>
              <button
                className={styles.synklogBtn}
                onClick={handleCreateSynklog}
                disabled={creatingLog}
              >
                ⚡ {creatingLog ? '생성 중...' : 'SYNKLOG 생성하기'}
              </button>
            </div>
          )}

          {synklog?.status === 'PROCESSING' && (
            <div className={styles.synklogEmpty}>
              <div className={styles.synklogIconWrap}>
                <span className={styles.synklogIcon}>⏳</span>
              </div>
              <p className={styles.synklogEmptyTitle}>SYNKLOG 생성 중...</p>
              <p className={styles.synklogEmptyDesc}>잠시 후 완성돼요</p>
            </div>
          )}

          {synklog?.status === 'COMPLETED' && (
            <div className={styles.synklogComplete}>
              {synklog.thumbnail && (
                <img src={synklog.thumbnail} alt="SYNKLOG" className={styles.synklogThumb} />
              )}
              <div className={styles.synklogCompleteInfo}>
                <p className={styles.synklogCompleteTitle}>SYNKLOG 완성!</p>
                {synklog.missions?.map((m, i) => (
                  <p key={i} className={styles.synklogMission}>· {m.missionTitle}</p>
                ))}
                <button
                  className={styles.synklogBtn}
                  onClick={() => synklog.synklogVideoUrl && window.open(synklog.synklogVideoUrl, '_blank')}
                >
                  SYNKLOG 보기
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
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
