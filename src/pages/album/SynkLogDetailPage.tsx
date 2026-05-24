import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './SynkLogDetailPage.module.css'

const MOCK_SYNKLOG = {
  id: 1,
  date: '2026.05.07',
  missions: ['지금 네 표정 그대로 찍기', '지금 손에 있는 것 찍기'],
  photos: [
    { id: 1, memberName: '유현', thumbColor: '#2a2535' },
  ],
}

export default function SynkLogDetailPage() {
  const { synklogId } = useParams<{ roomId: string; synklogId: string }>()
  const navigate = useNavigate()
  const [photoView, setPhotoView] = useState<number | null>(null)

  if (photoView !== null) {
    return <PhotoView
      onBack={() => setPhotoView(null)}
      color={MOCK_SYNKLOG.photos[photoView]?.thumbColor ?? '#1a1a2e'}
    />
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <BackIcon />
        </button>
        <h1 className={styles.headerTitle}>{MOCK_SYNKLOG.date} SYNK</h1>
        <div className={styles.headerRight} />
      </div>

      {/* ── 콘텐츠 ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {/* 미션 카드 */}
        <div className={styles.missionCard}>
          <p className={styles.missionHeader}>⚡ 수행한 미션 ⚡</p>
          {MOCK_SYNKLOG.missions.map((m, i) => (
            <p key={i} className={styles.missionText}>{m}</p>
          ))}
          <button
            className={styles.synkBtn}
            onClick={() => navigate(ROUTES.MISSION_RESULT(synklogId ?? 1))}
          >
            SYNK
          </button>
        </div>

        {/* 포토 그리드 */}
        {MOCK_SYNKLOG.photos.length > 0 && (
          <div className={styles.photoGrid}>
            {MOCK_SYNKLOG.photos.map((photo, i) => (
              <button
                key={photo.id}
                className={styles.photoThumb}
                style={{ background: photo.thumbColor }}
                onClick={() => setPhotoView(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoView({ onBack, color }: { onBack: () => void; color: string }) {
  return (
    <div className={styles.photoPage}>
      <div className={styles.photoHeader}>
        <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <span className={styles.photoHeaderTitle}>2026.05.07 SYNK</span>
        <div className={styles.headerRight} />
      </div>
      <div className={styles.photoFull} style={{ background: color }} />
      <div className={styles.photoFooter}>
        <button className={styles.photoShareBtn}>공유</button>
        <button className={styles.photoSaveBtn}>저장</button>
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
