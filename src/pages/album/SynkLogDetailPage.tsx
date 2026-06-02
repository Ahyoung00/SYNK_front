import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import type { CollageItem, SynklogDetailResponse } from '@/types'
import styles from './SynkLogDetailPage.module.css'

export default function SynkLogDetailPage() {
  const { roomId, date } = useParams<{ roomId: string; date: string }>()
  const navigate    = useNavigate()
  const setActive   = useMissionStore((s) => s.setActive)
  const previewUrl  = useMissionStore((s) => s.previewUrl)
  const myUser      = useAuthStore((s) => s.user)
  const numRoomId   = Number(roomId)

  const [collages, setCollages]             = useState<CollageItem[]>([])
  const [synklog, setSynklog]               = useState<SynklogDetailResponse | null>(null)
  const [synklogMissing, setSynklogMissing] = useState(false)
  const [isLoading, setIsLoading]           = useState(true)
  const [error, setError]                   = useState(false)
  const [creatingLog, setCreatingLog]       = useState(false)

  useEffect(() => {
    if (!date) return

    albumApi.getCollages(numRoomId, date)
      .then((res) => setCollages(res.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))

    albumApi.getSynklog(numRoomId, date)
      .then((res) => setSynklog(res.data))
      .catch(() => setSynklogMissing(true))
  }, [numRoomId, date])

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
        name:                '',
        code:                '',
        thumbnail:           null,
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
            id:           0,
            user_id:      p.userId,
            room_id:      numRoomId,
            mission_id:   item.missionId,
            video_url:    effectiveVideoUrl ?? '',
            status:       'SUBMITTED' as const,
            submitted_at: p.submittedAt,
          } : undefined,
        }
      }),
    })
    navigate(ROUTES.MISSION_RESULT(item.missionId), { state: { returnTo: 'album' } })
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SynkHeader date={date ?? ''} onBack={() => navigate(-1)} />
        <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          불러오는 중...
        </p>
      </div>
    )
  }

  if (error || collages.length === 0) {
    return (
      <div className={styles.page}>
        <SynkHeader date={date ?? ''} onBack={() => navigate(-1)} />
        <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          데이터를 불러올 수 없어요
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <SynkHeader date={collages[0] ? date ?? '' : ''} onBack={() => navigate(-1)} />

      <div className={styles.scroll}>

        {/* ── 미션별 콜라주 ────────────────────────────────────────────────── */}
        {collages.map((item) => (
          <div key={item.missionId} className={styles.missionCard}>
            <div className={styles.missionRow}>
              <p className={styles.missionText}>{item.missionTitle}</p>
              <button
                className={styles.collageBtn}
                onClick={() => handleViewCollage(item)}
              >
                콜라주
              </button>
            </div>
          </div>
        ))}

        {/* ── SYNKLOG 합본 영상 ────────────────────────────────────────────── */}
        <div className={styles.missionCard}>
          <p className={styles.missionHeader}>🎬 오늘의 SYNKLOG</p>

          {synklogMissing && (
            <>
              <p className={styles.missionMeta}>아직 SYNKLOG가 생성되지 않았어요</p>
              <button
                className={styles.synkBtn}
                onClick={handleCreateSynklog}
                disabled={creatingLog}
              >
                {creatingLog ? '생성 중...' : 'SYNKLOG 생성하기'}
              </button>
            </>
          )}

          {synklog?.status === 'PROCESSING' && (
            <p className={styles.missionMeta}>⏳ SYNKLOG 생성 중...</p>
          )}

          {synklog?.status === 'COMPLETED' && (
            <>
              {synklog.missions?.map((m, i) => (
                <p key={i} className={styles.missionText}>· {m.missionTitle}</p>
              ))}
              <button
                className={styles.synkBtn}
                onClick={() => {
                  if (synklog.synklogVideoUrl) {
                    window.open(synklog.synklogVideoUrl, '_blank')
                  }
                }}
                disabled={!synklog.synklogVideoUrl}
              >
                SYNKLOG 보기
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

function SynkHeader({ date, onBack }: { date: string; onBack: () => void }) {
  return (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
        <BackIcon />
      </button>
      <h1 className={styles.headerTitle}>{date} SYNK</h1>
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
