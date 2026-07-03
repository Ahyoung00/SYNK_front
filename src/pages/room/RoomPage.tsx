import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi, albumApi } from '@/services/api/endpoints'
import type { RoomDetail, AlbumItem, CollageItem } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useRoomEvents } from '@/hooks/useRoomEvents'
import NavHeader from '@/components/layout/NavHeader'
import Loading from '@/components/ui/Loading'
import InviteSheet from '@/components/room/InviteSheet'
import styles from './RoomPage.module.css'

export default function RoomPage() {
  const { roomId }       = useParams<{ roomId: string }>()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const inviteCode       = searchParams.get('code')
  const id               = Number(roomId)
  const myUserId         = useAuthStore((s) => s.user?.userId)

  const [room, setRoom]               = useState<RoomDetail | null>(null)
  const [albums, setAlbums]           = useState<AlbumItem[]>([])
  const [todayCollages, setTodayCollages] = useState<CollageItem[]>([])
  const [codeCopied, setCodeCopied]   = useState(false)
  const [isLoading, setIsLoading]     = useState(true)

  const now = new Date()
  const todayDash = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const [notMember, setNotMember]     = useState(false)
  const [joining, setJoining]         = useState(false)
  const [inviteOpen, setInviteOpen]   = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      roomApi.getRoom(id),
      albumApi.getRecentAlbums(id, 4),
      albumApi.getCollages(id, todayDash).catch(() => ({ data: [] })),
    ])
      .then(([roomRes, albumsRes, collagesRes]) => {
        setRoom(roomRes.data)
        setAlbums(albumsRes.data)
        setTodayCollages(collagesRes.data ?? [])
      })
      .catch(() => {
        setNotMember(true)
      })
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleJoin() {
    if (!inviteCode || joining) return
    setJoining(true)
    try {
      await roomApi.joinRoom(inviteCode)
      window.location.href = `/room/${id}`
    } catch {
      setJoining(false)
    }
  }

  function copyCode() {
    if (!room) return
    navigator.clipboard?.writeText(room.code).catch(() => {})
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  useRoomEvents(id || undefined, {
    onMemberKicked: (e) => {
      const kickedUserId = (e.payload as { userId?: number } | undefined)?.userId
      if (kickedUserId === myUserId) {
        alert('방에서 강퇴되었습니다.')
        navigate(ROUTES.ROOMS, { replace: true })
      } else if (kickedUserId != null) {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.filter((m) => m.userId !== kickedUserId),
                currentMembers: prev.currentMembers - 1,
              }
            : prev,
        )
      }
    },
  })

  function handleLeave() {
    if (!window.confirm('방에서 나가시겠어요?')) return
    roomApi.leaveRoom(id)
      .then(() => navigate(ROUTES.ROOMS, { replace: true }))
      .catch(console.error)
  }

  function handleDeleteRoom() {
    if (!window.confirm('방을 삭제하시겠어요?\n방의 모든 기록이 사라지며 되돌릴 수 없어요.')) return
    roomApi.deleteRoom(id)
      .then(() => navigate(ROUTES.ROOMS, { replace: true }))
      .catch(console.error)
  }


  async function handleTestNotification() {
    try {
      await roomApi.testNotification(id)
      alert('✅ FCM 알림 발송 완료!\n방 멤버 전원에게 알림이 전송됐어요.')
    } catch {
      alert('❌ 알림 발송 실패')
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <NavHeader title="방" onBack={() => navigate(ROUTES.ROOMS)} />
        <div className={styles.scroll}>
          <Loading />
        </div>
      </div>
    )
  }

  if (notMember) {
    return (
      <div className={styles.page}>
        <NavHeader title="방 참여" onBack={() => navigate(ROUTES.ROOMS)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, padding: '40px 24px' }}>
          <span style={{ fontSize: 56 }}>🔗</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#F3F5FF', textAlign: 'center' }}>초대받은 방이에요</p>
          <p style={{ fontSize: 'var(--text-sm)', color: '#9AA0BD', textAlign: 'center' }}>아직 이 방의 멤버가 아니에요</p>
          {inviteCode ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{ width: '100%', maxWidth: 320, padding: '14px', background: 'linear-gradient(135deg, #46D7FF 0%, #9B6BFF 100%)', borderRadius: 14, fontSize: 'var(--text-base)', fontWeight: 700, color: '#fff', opacity: joining ? 0.6 : 1 }}
            >
              {joining ? '입장 중...' : '방 입장하기'}
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.ROOM_JOIN)}
              style={{ width: '100%', maxWidth: 320, padding: '14px', background: 'linear-gradient(135deg, #46D7FF 0%, #9B6BFF 100%)', borderRadius: 14, fontSize: 'var(--text-base)', fontWeight: 700, color: '#fff' }}
            >
              코드로 참여하기
            </button>
          )}
          <button onClick={() => navigate(ROUTES.ROOMS)} style={{ fontSize: 'var(--text-sm)', color: '#9AA0BD' }}>취소</button>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className={styles.page}>
        <NavHeader title="방" onBack={() => navigate(ROUTES.ROOMS)} />
        <div className={styles.scroll}>
          <p style={{ padding: '40px 20px', textAlign: 'center', color: '#9AA0BD' }}>방을 찾을 수 없어요</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title={room.name}
        onBack={() => navigate(ROUTES.ROOMS)}
        titleLeft={
          <div className={styles.roomThumb}>
            <img src={room.thumbnail ?? '/SYNK.jpeg'} alt={room.name} className={styles.roomThumbImg} />
          </div>
        }
        right={
          <button
            className={styles.chatBtn}
            onClick={() => navigate(ROUTES.ROOM_CHAT(id))}
            aria-label="채팅"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#fff" />
            </svg>
            채팅
          </button>
        }
      />

      {/* ── 스크롤 영역 ─────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {/* ── 초대 코드 ────────────────────────────────────────────────────── */}
        <div className={styles.codeCard}>
          <span className={styles.codeLabel}>초대 코드</span>
          <span className={styles.codeValue}>{room.code}</span>
          <button className={styles.copyBtn} onClick={copyCode}>
            {codeCopied ? <CheckIcon /> : <CopyIcon />}
            {codeCopied ? '복사됨' : '복사'}
          </button>
        </div>

        {/* ── 멤버 ─────────────────────────────────────────────────────────── */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>멤버 {room.currentMembers}/{room.maxMembers}</span>
        </div>
        <div className={styles.memberRow}>
            {room.members.map((m) => (
              <div key={m.userId} className={styles.memberItem}>
                <div className={styles.memberAvatarWrap}>
                  <div className={styles.memberAvatar}>
                    {m.profileImage
                      ? <img src={m.profileImage} alt={m.name} className={styles.memberAvatarImg} />
                      : (m.name?.charAt(0) ?? '?')
                    }
                  </div>
                  {m.userId === myUserId && <span className={styles.meBadge}>나</span>}
                </div>
                <span className={styles.memberName}>{m.name ?? '알 수 없음'}</span>
              </div>
            ))}
            {room.currentMembers < room.maxMembers && (
              <button
                className={styles.inviteBtn}
                onClick={() => setInviteOpen(true)}
              >
                <div className={styles.inviteBtnIcon}>＋</div>
                <span className={styles.inviteBtnLabel}>초대</span>
              </button>
            )}
        </div>

        {/* ── 오늘 미션 ────────────────────────────────────────────────────── */}
        <RoomMissionCard
          total={room.dailyMissionCount}
          completed={todayCollages.filter((c) => c.status === 'COMPLETED').length}
          fired={todayCollages.length}
        />

        {/* ── 앨범 ─────────────────────────────────────────────────────────── */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>앨범</span>
          <button
            className={styles.sectionAction}
            onClick={() => navigate(ROUTES.ROOM_ALBUM(id))}
          >
            전체 보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        {albums.length === 0 ? (
          <div className={styles.albumEmpty}>아직 앨범이 없어요</div>
        ) : (
          <div className={styles.albumGrid}>
            {albums.map((log) => (
              <button
                key={log.date}
                className={styles.albumThumbBtn}
                onClick={() => navigate(ROUTES.ROOM_SYNKLOG(id, log.date.replace(/\./g, '-')), { state: { scrollToThumbnail: log.thumbnail } })}
              >
                {log.thumbnail
                  ? <img src={log.thumbnail} alt={log.date} className={styles.albumThumbImg} />
                  : (
                    <div className={styles.albumThumbPlaceholder}>
                      <span className={styles.albumDate}>{log.date}</span>
                    </div>
                  )
                }
              </button>
            ))}
          </div>
        )}

        {/* ── Synklog 배너 ─────────────────────────────────────────────────── */}
        {(
          <button
            className={styles.synklogBanner}
            onClick={() => navigate(ROUTES.SYNKLOG_DATE_SELECT(id))}
          >
            <div className={styles.synklogBannerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className={styles.synklogBannerText}>
              <span className={styles.synklogBannerTitle}>SYNKLOG 생성하기</span>
              <span className={styles.synklogBannerSub}>날짜를 선택해 추억 영상으로 만들어요</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {/* ── 방 설정 / 나가기 ──────────────────────────────────────────────── */}
        <div className={styles.footerBtns}>
          <div className={styles.devBtns}>
            <button
              onClick={handleTestNotification}
              className={styles.devBtn}
            >
              🔔 FCM 알림 테스트
            </button>
          </div>
          <div className={styles.actionCard}>
            <button className={styles.settingsBtn} onClick={() => navigate(ROUTES.ROOM_SETTINGS(id))}>
              <SettingsIcon />
              <span className={styles.settingsBtnLabel}>방 설정</span>
              <ChevronIcon />
            </button>
            <div className={styles.actionDivider} />
            {room.ownerId === myUserId ? (
              <button className={styles.leaveBtn} onClick={handleDeleteRoom}>
                <LeaveIcon />
                <span className={styles.leaveBtnLabel}>방 삭제하기</span>
                <ChevronIcon />
              </button>
            ) : (
              <button className={styles.leaveBtn} onClick={handleLeave}>
                <LeaveIcon />
                <span className={styles.leaveBtnLabel}>방 나가기</span>
                <ChevronIcon />
              </button>
            )}
          </div>
        </div>

      </div>

      <InviteSheet
        roomId={id}
        roomCode={room.code}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  )
}

/* ── 아이콘 ───────────────────────────────────────────────────────────────── */

function RoomMissionCard({ total, completed, fired }: { total: number; completed: number; fired: number }) {
  const allDone = total > 0 && completed >= total
  const inProgress = fired > 0 && !allDone
  const remaining = Math.max(0, total - completed)
  const pct = total > 0 ? (completed / total) * 100 : 0

  if (allDone) {
    return (
      <div className={[styles.missionCard, styles.missionCardDone].join(' ')}>
        <div className={styles.missionRow}>
          <div className={[styles.missionIconWrap, styles.missionIconDone].join(' ')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className={styles.missionLeft}>
            <span className={styles.missionStatus}>오늘 미션 모두 완료! 🎉</span>
            <span className={styles.missionDesc}>{completed} / {total} · 내일 또 만나요</span>
          </div>
        </div>
      </div>
    )
  }

  if (inProgress) {
    return (
      <div className={[styles.missionCard, styles.missionCardProgress].join(' ')}>
        <div className={styles.missionRow}>
          <div className={styles.missionIconWrap}><MissionIcon /></div>
          <div className={styles.missionLeft}>
            <div className={styles.missionTitleRow}>
              <span className={styles.missionStatus}>오늘 미션 {remaining}개 남았어요!</span>
              <span className={styles.missionPulseDot} />
            </div>
            <span className={styles.missionDesc}>{completed} / {total} 완료 · 계속 도전해봐요</span>
            <div className={styles.missionBar}>
              <div className={styles.missionBarFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.missionCard}>
      <div className={styles.missionRow}>
        <div className={styles.missionIconWrap}><MissionIcon /></div>
        <div className={styles.missionLeft}>
          <span className={styles.missionStatus}>오늘 미션 {total}개 예정</span>
          <span className={styles.missionDesc}>랜덤한 순간에 미션이 울려요</span>
        </div>
      </div>
    </div>
  )
}

function MissionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" />
    </svg>
  )
}


function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M5 16V5a1 1 0 011-1h9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  )
}

function LeaveIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1v-3" />
      <path d="M10 12h10m0 0l-3-3m3 3l-3 3" />
    </svg>
  )
}
