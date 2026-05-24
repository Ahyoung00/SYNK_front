import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import AppHeader from '@/components/layout/AppHeader'
import styles from './CollectionPage.module.css'

const TOTAL = 90
const COMPLETED = 38
const RATE = Math.round((COMPLETED / TOTAL) * 100)

// Mock 미션 수집 데이터 (백엔드 연동 전)
const MOCK_MISSIONS = [
  { id: 1, title: '지금 네 표정 그대로 찍기', count: 14, lastDate: '2026.05.07', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 2, title: '지금 손에 있는 것 찍기',   count: 8,  lastDate: '2026.05.05', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 3, title: '발밑 찍기',                  count: 6,  lastDate: '2026.05.02', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 4, title: '하늘 찍기',                  count: 5,  lastDate: '2026.04.30', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 5, title: '아침 식사 찍기',             count: 3,  lastDate: '2026.04.28', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 6, title: '창문 밖 풍경 찍기',          count: 2,  lastDate: '2026.04.22', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
]

export default function CollectionPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <AppHeader subtitle="내가 완료한 미션" />

      <div className={styles.scroll}>
        {/* ── 수집률 카드 ────────────────────────────────────────────────────── */}
        <div className={styles.statsCard}>
          <span className={styles.statsLabel}>수집률</span>
          <div className={styles.statsRow}>
            <span className={styles.statsRate}>{RATE}%</span>
            <span className={styles.statsCount}>{COMPLETED} / {TOTAL} 미션 완료</span>
          </div>
        </div>

        {/* ── 미션 목록 ──────────────────────────────────────────────────────── */}
        <div className={styles.missionList}>
          {MOCK_MISSIONS.map((m) => (
            <button
              key={m.id}
              className={styles.missionCard}
              onClick={() => navigate(ROUTES.COLLECTION_DETAIL(m.id))}
            >
              <div className={styles.thumbnail} style={{ background: m.gradient }} />
              <div className={styles.missionInfo}>
                <span className={styles.missionTitle}>{m.title}</span>
                <span className={styles.missionMeta}>완료 횟수 {m.count}회</span>
                <span className={styles.missionMeta}>최근 {m.lastDate}</span>
              </div>
              <span className={styles.arrow}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

