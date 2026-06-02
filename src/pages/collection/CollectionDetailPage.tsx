import { useParams } from 'react-router-dom'
import NavHeader from '@/components/layout/NavHeader'
import styles from './CollectionDetailPage.module.css'

// Mock 미션 데이터
const MOCK_MISSIONS: Record<string, { title: string; description: string; count: number; lastDate: string }> = {
  '1': { title: '지금 네 표정 그대로 찍기', description: '카메라 앞, 있는 그대로', count: 14, lastDate: '2026.05.07' },
  '2': { title: '지금 손에 있는 것 찍기',   description: '손에 뭐든 들고 찍어요',   count: 8,  lastDate: '2026.05.05' },
  '3': { title: '발밑 찍기',                  description: '지금 발 아래를 찍어요',   count: 6,  lastDate: '2026.05.02' },
  '4': { title: '하늘 찍기',                  description: '지금 이 순간의 하늘',     count: 5,  lastDate: '2026.04.30' },
  '5': { title: '아침 식사 찍기',             description: '오늘 아침 뭐 먹었나요?',  count: 3,  lastDate: '2026.04.28' },
  '6': { title: '창문 밖 풍경 찍기',          description: '창밖을 바라보세요',       count: 2,  lastDate: '2026.04.22' },
}

// 내 기록 목 데이터 (방 이름 + 날짜 + 그라디언트)
const MOCK_RECORDS = [
  { id: 1, roomName: '새벽반',   date: '2026.05.07', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 2, roomName: '새벽반',   date: '2026.04.27', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 3, roomName: '대학동기', date: '2026.02.15', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 4, roomName: '여행팟',   date: '2026.01.17', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
]

export default function CollectionDetailPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const mission = MOCK_MISSIONS[missionId ?? '1'] ?? MOCK_MISSIONS['1']

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="미션 상세" />

      <div className={styles.scroll}>
        {/* ── 미션 설명 카드 ──────────────────────────────────────────────────── */}
        <div className={styles.missionCard}>
          <div className={styles.missionAvatar}>
            <span className={styles.missionAvatarText}>나</span>
          </div>
          <div className={styles.missionText}>
            <span className={styles.missionTitle}>{mission.title}</span>
            <span className={styles.missionDesc}>{mission.description}</span>
          </div>
        </div>

        {/* ── 통계 ────────────────────────────────────────────────────────────── */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>완료 횟수</span>
            <span className={styles.statValue}>{mission.count}회</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statLabel}>마지막 완료</span>
            <span className={styles.statValue}>{mission.lastDate}</span>
          </div>
        </div>

        {/* ── 내 기록 ─────────────────────────────────────────────────────────── */}
        <div>
          <h2 className={styles.sectionTitle}>내 기록</h2>
          <div className={styles.photoGrid}>
            {MOCK_RECORDS.map((r) => (
              <div key={r.id} className={styles.photoCell}>
                <div className={styles.photo} style={{ background: r.gradient }} />
                <span className={styles.photoLabel}>{r.roomName} - {r.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

