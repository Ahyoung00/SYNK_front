import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomPage.module.css'

const MOCK_ROOM = {
  id: 1,
  name: '새벽반',
  code: '7X8K2',
  members: [
    { id: 1, name: '유현', emoji: '😊' },
    { id: 2, name: '아영', emoji: '😺' },
    { id: 3, name: '지민', emoji: '🐥' },
    { id: 4, name: '수현', emoji: '🥷' },
    { id: 5, name: '대주', emoji: '🌸' },
  ],
  album: [
    { id: 1, thumb: null, date: '2026.05.07', members: ['😊', '😺', '🐥', '🥷'] },
    { id: 2, thumb: null, date: '2026.05.03', members: ['😊', '😺', '🐥'] },
  ],
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const [codeCopied, setCodeCopied] = useState(false)

  function copyCode() {
    navigator.clipboard?.writeText(MOCK_ROOM.code).catch(() => {})
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  function handleLeave() {
    if (!window.confirm('방에서 나가시겠어요?')) return
    navigate(ROUTES.ROOMS, { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title={MOCK_ROOM.name}
        onBack={() => navigate(ROUTES.ROOMS)}
        titleExtra={
          <button
            className={styles.chatBtn}
            onClick={() => navigate(ROUTES.ROOM_CHAT(Number(roomId)))}
            aria-label="채팅"
          >
            💬
          </button>
        }
      />

      {/* ── 스크롤 영역 ─────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {/* ── 초대 코드 ────────────────────────────────────────────────────────── */}
        <div className={styles.codeRow}>
          <span className={styles.codeLabel}>코드</span>
          <span className={styles.codeValue}>{MOCK_ROOM.code}</span>
          <button className={styles.copyBtn} onClick={copyCode}>
            {codeCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        <div className={styles.divider} />

        {/* ── 멤버 ─────────────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionIcon}>👤</span>
          <span className={styles.sectionTitle}>멤버</span>
        </div>
        <div className={styles.memberRow}>
          {MOCK_ROOM.members.map((m) => (
            <div key={m.id} className={styles.memberItem}>
              <div className={styles.memberAvatar}>{m.emoji}</div>
              <span className={styles.memberName}>{m.name}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* ── 앨범 ─────────────────────────────────────────────────────────────── */}
        <div className={styles.albumHeader}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>앨범</span>
          </div>
          <button
            className={styles.viewAllBtn}
            onClick={() => navigate(ROUTES.ROOM_ALBUM(Number(roomId)))}
          >
            전체 보기
          </button>
        </div>
        <div className={styles.albumGrid}>
          {MOCK_ROOM.album.map((a) => (
            <button
              key={a.id}
              className={styles.albumThumb}
              onClick={() => navigate(ROUTES.ROOM_SYNKLOG(Number(roomId), a.id))}
            >
              <div className={styles.albumPlaceholder}>
                <span className={styles.albumDate}>{a.date}</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* ── 방 설정 ──────────────────────────────────────────────────────────── */}
        <button
          className={styles.settingsBtn}
          onClick={() => navigate(ROUTES.ROOM_SETTINGS(Number(roomId)))}
        >
          <span className={styles.settingsBtnIcon}>📋</span>
          <span className={styles.settingsBtnLabel}>방 설정</span>
          <span className={styles.settingsBtnArrow}>›</span>
        </button>
      </div>

      {/* ── 방 나가기 ────────────────────────────────────────────────────────── */}
      <div className={styles.footer}>
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
