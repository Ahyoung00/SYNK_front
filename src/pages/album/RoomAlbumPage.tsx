import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './RoomAlbumPage.module.css'

const MOCK_ALBUM = [
  { id: 1, date: '2026.05.07', members: ['😊', '😺', '🐥', '🥷'], thumbColor: '#2a2535' },
  { id: 2, date: '2026.05.03', members: ['😊', '😺', '🐥'],        thumbColor: '#1e2a35' },
  { id: 3, date: '2026.05.01', members: ['😊', '😺', '🌸'],        thumbColor: '#352a1e' },
]

export default function RoomAlbumPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()

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

      {/* ── 서브타이틀 ──────────────────────────────────────────────────────── */}
      <p className={styles.subtitle}>우리의 소중한 추억들</p>

      {/* ── 목록 ────────────────────────────────────────────────────────────── */}
      <div className={styles.list}>
        {MOCK_ALBUM.map((entry) => (
          <button
            key={entry.id}
            className={styles.entry}
            onClick={() => navigate(ROUTES.ROOM_SYNKLOG(Number(roomId), entry.id))}
          >
            {/* 썸네일 */}
            <div className={styles.thumb} style={{ background: entry.thumbColor }} />

            {/* 정보 */}
            <div className={styles.info}>
              <span className={styles.date}>{entry.date}</span>
              <div className={styles.avatarStack}>
                {entry.members.map((emoji, i) => (
                  <span key={i} className={styles.avatarBubble}>{emoji}</span>
                ))}
              </div>
            </div>

            <span className={styles.arrow}>›</span>
          </button>
        ))}
      </div>
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
