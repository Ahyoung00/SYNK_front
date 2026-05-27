import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { albumApi, roomApi } from '@/services/api/endpoints'
import { useMissionStore } from '@/store/missionStore'
import { ROUTES } from '@/constants'
import type { SynklogDetailResponse, SynklogMission } from '@/types'
import styles from './SynkLogDetailPage.module.css'

export default function SynkLogDetailPage() {
  const { roomId, date } = useParams<{ roomId: string; date: string }>()
  const navigate  = useNavigate()
  const setActive = useMissionStore((s) => s.setActive)
  const numRoomId = Number(roomId)

  const [data, setData]       = useState<SynklogDetailResponse | null>(null)
  const [roomName, setRoomName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!date) return
    Promise.all([
      albumApi.getCollages(numRoomId, date),
      roomApi.getRoom(numRoomId),
    ])
      .then(([collageRes, roomRes]) => {
        setData(collageRes.data)
        setRoomName(roomRes.data.name)
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [numRoomId, date])

  function handleSynk(mission: SynklogMission) {
    // active 스토어에 히스토리 미션 데이터 세팅 → MissionResultPage가 콜라주 빌드
    setActive({
      mission: {
        id:                  mission.missionId,
        room_id:             numRoomId,
        mission_template_id: 0,
        type:                'VIDEO',
        status:              'ACTIVE',
        targeted_at:         mission.createdAt,
        deadline:            mission.createdAt,
        created_at:          mission.createdAt,
        template: { id: 0, title: mission.missionTitle },
      },
      room: {
        id:                  numRoomId,
        name:                roomName,
        code:                '',
        thumbnail:           null,
        owner_id:            0,
        max_members:         mission.participants.length,
        current_members:     mission.participants.length,
        daily_mission_count: 1,
        mission_start_time:  '',
        mission_end_time:    '',
        created_at:          null,
      },
      seconds_left: 0,
      participations: mission.participants.map((p) => ({
        user: { userId: p.userId, name: p.name, profileImage: p.profileImage },
        state: p.state,
        submission: p.videoUrl ? {
          id:           0,
          user_id:      p.userId,
          room_id:      numRoomId,
          mission_id:   mission.missionId,
          video_url:    p.videoUrl,
          status:       'SUBMITTED' as const,
          submitted_at: p.submittedAt,
        } : undefined,
      })),
    })
    navigate(ROUTES.MISSION_RESULT(mission.missionId), { state: { returnTo: 'album' } })
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SynkHeader date={date ?? ''} onBack={() => navigate(-1)} />
        <p style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          불러오는 중...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <SynkHeader date={date ?? ''} onBack={() => navigate(-1)} />
        <p style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          데이터를 불러올 수 없어요
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <SynkHeader date={data.date} onBack={() => navigate(-1)} />

      {/* ── 콘텐츠 ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {data.missions.map((m) => {
          const submittedCount = m.participants.filter((p) => p.state === 'done').length
          const totalCount     = m.participants.length

          return (
            <div key={m.missionId} className={styles.missionCard}>
              <p className={styles.missionHeader}>⚡ 수행한 미션</p>
              <p className={styles.missionText}>{m.missionTitle}</p>

              {/* 참여율 */}
              <p className={styles.missionMeta}>
                {submittedCount}/{totalCount}명 참여
              </p>

              {/* 참여자 아바타 행 */}
              <div className={styles.avatarRow}>
                {m.participants.map((p) => (
                  <div
                    key={p.userId}
                    className={[
                      styles.avatarItem,
                      p.state === 'done' ? styles.avatarDone : styles.avatarMissed,
                    ].join(' ')}
                  >
                    {p.profileImage
                      ? <img src={p.profileImage} alt={p.name} className={styles.avatarImg} />
                      : <span className={styles.avatarInitial}>{p.name.charAt(0)}</span>
                    }
                  </div>
                ))}
              </div>

              {/* SYNK 버튼 → 콜라주 결과 */}
              <button
                className={styles.synkBtn}
                onClick={() => handleSynk(m)}
              >
                SYNK 보기
              </button>
            </div>
          )
        })}
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
