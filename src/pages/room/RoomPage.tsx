import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi, albumApi, debugApi } from '@/services/api/endpoints'
import type { RoomDetail, AlbumItem } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomPage.module.css'

export default function RoomPage() {
  const { roomId }       = useParams<{ roomId: string }>()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const inviteCode       = searchParams.get('code')
  const id               = Number(roomId)

  const [room, setRoom]               = useState<RoomDetail | null>(null)
  const [albums, setAlbums]           = useState<AlbumItem[]>([])
  const [codeCopied, setCodeCopied]   = useState(false)
  const [isLoading, setIsLoading]     = useState(true)
  const [triggering, setTriggering]   = useState(false)
  const [notMember, setNotMember]     = useState(false)
  const [joining, setJoining]         = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      roomApi.getRoom(id),
      albumApi.getAlbums(id),
    ])
      .then(([roomRes, albumsRes]) => {
        setRoom(roomRes.data)
        setAlbums(albumsRes.data)
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

  function handleLeave() {
    if (!window.confirm('방에서 나가시겠어요?')) return
    roomApi.leaveRoom(id)
      .then(() => navigate(ROUTES.ROOMS, { replace: true }))
      .catch(console.error)
  }

  async function handleTriggerMission() {
    if (triggering) return
    setTriggering(true)
    try {
      const res = await debugApi.triggerMission(id)
      alert(`✅ 미션 발동!\n"${res.data.title}"\n\n홈으로 이동하면 미션 카드가 떠요.`)
      navigate(ROUTES.HOME)
    } catch (e) {
      alert('미션 발동 실패 (이미 활성 미션이 있을 수 있어요)')
    } finally {
      setTriggering(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <NavHeader title="방" onBack={() => navigate(ROUTES.ROOMS)} />
        <div className={styles.scroll}>
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>불러오는 중...</p>
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
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text)', textAlign: 'center' }}>초대받은 방이에요</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textAlign: 'center' }}>아직 이 방의 멤버가 아니에요</p>
          {inviteCode ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{ width: '100%', maxWidth: 320, padding: '14px', background: 'var(--color-primary)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: '#fff', opacity: joining ? 0.6 : 1 }}
            >
              {joining ? '입장 중...' : '방 입장하기'}
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.ROOM_JOIN)}
              style={{ width: '100%', maxWidth: 320, padding: '14px', background: 'var(--color-primary)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: '#fff' }}
            >
              코드로 참여하기
            </button>
          )}
          <button onClick={() => navigate(ROUTES.ROOMS)} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>취소</button>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className={styles.page}>
        <NavHeader title="방" onBack={() => navigate(ROUTES.ROOMS)} />
        <div className={styles.scroll}>
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>방을 찾을 수 없어요</p>
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
        titleExtra={
          <button
            className={styles.chatBtn}
            onClick={() => navigate(ROUTES.ROOM_CHAT(id))}
            aria-label="채팅"
          >
            💬
          </button>
        }
      />

      {/* ── 스크롤 영역 ─────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {/* ── 초대 코드 ────────────────────────────────────────────────────── */}
        <div className={styles.codeRow}>
          <span className={styles.codeLabel}>코드</span>
          <span className={styles.codeValue}>{room.code}</span>
          <button className={styles.copyBtn} onClick={copyCode}>
            {codeCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        <div className={styles.divider} />

        {/* ── 멤버 ─────────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionIcon}>👤</span>
          <span className={styles.sectionTitle}>멤버 {room.currentMembers}/{room.maxMembers}</span>
        </div>
        <div className={styles.memberRow}>
          {room.members.map((m) => (
            <div key={m.userId} className={styles.memberItem}>
              <div className={styles.memberAvatar}>
                {m.profileImage
                  ? <img src={m.profileImage} alt={m.name} className={styles.memberAvatarImg} />
                  : (m.name?.charAt(0) ?? '?')
                }
              </div>
              <span className={styles.memberName}>{m.name ?? '알 수 없음'}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* ── 앨범 ─────────────────────────────────────────────────────────── */}
        <div className={styles.albumHeader}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>앨범</span>
          </div>
          <button
            className={styles.viewAllBtn}
            onClick={() => navigate(ROUTES.ROOM_ALBUM(id))}
          >
            전체 보기
          </button>
        </div>

        {albums.length === 0 ? (
          <p style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
            아직 앨범이 없어요
          </p>
        ) : (
          <div className={styles.albumGrid}>
            {albums.slice(0, 4).map((log) => (
              <button
                key={log.date}
                className={styles.albumThumb}
                onClick={() => navigate(ROUTES.ROOM_SYNKLOG(id, log.date.replace(/\./g, '-')))}
              >
                {log.thumbnail
                  ? <img src={log.thumbnail} alt={log.date} className={styles.albumThumbImg} />
                  : (
                    <div className={styles.albumPlaceholder}>
                      <span className={styles.albumDate}>{log.date}</span>
                    </div>
                  )
                }
              </button>
            ))}
          </div>
        )}

        <div className={styles.divider} />

        {/* ── 방 설정 ────────────────────────────────────────────────────────── */}
        <button
          className={styles.settingsBtn}
          onClick={() => navigate(ROUTES.ROOM_SETTINGS(id))}
        >
          <span className={styles.settingsBtnIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
          </span>
          <span className={styles.settingsBtnLabel}>방 설정</span>
          <span className={styles.settingsBtnArrow}>›</span>
        </button>
      </div>

      {/* ── 방 나가기 ─────────────────────────────────────────────────────────── */}
      <div className={styles.footer}>
        {import.meta.env.DEV && (
          <button
            onClick={handleTriggerMission}
            disabled={triggering}
            style={{
              width: '100%', padding: '10px', marginBottom: 8,
              background: 'rgba(250,204,21,0.15)', border: '1px dashed #facc15',
              borderRadius: 10, color: '#facc15', fontSize: 13, cursor: 'pointer',
            }}
          >
            {triggering ? '발동 중...' : '🧪 미션 강제 발동 (개발용)'}
          </button>
        )}
        <button className={styles.leaveBtn} onClick={handleLeave}>
          <LeaveIcon />
          방 나가기
        </button>
      </div>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function LeaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

