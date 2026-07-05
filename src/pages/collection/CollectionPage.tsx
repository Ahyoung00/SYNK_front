import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { collectionApi, roomApi, albumApi } from '@/services/api/endpoints'
import type { CollectionListResponse, CollectionMissionItem, MySynklogItem } from '@/types'
import AppHeader from '@/components/layout/AppHeader'
import Loading from '@/components/ui/Loading'
import { missionGradient } from '@/utils/missionVisual'
import { downloadVideo } from '@/utils/downloadVideo'
import styles from './CollectionPage.module.css'

type TabType = 'mission' | 'synklog'

// 카테고리 정의 (아직 백엔드 미지원 — 랜덤 배정)
const CATEGORIES = [
  { id: 'daily',  label: '일상',  color: '#46D7FF' },
  { id: 'sense',  label: '감각',  color: '#9B6BFF' },
  { id: 'place',  label: '장소',  color: '#2DDAB8' },
] as const

function getCategory(missionId: number) {
  return CATEGORIES[missionId % CATEGORIES.length]
}

function RingChart({ rate }: { rate: number }) {
  const r = 38
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - rate / 100)
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className={styles.ring}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="92" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#46D7FF" />
          <stop offset="1" stopColor="#9B6BFF" />
        </linearGradient>
      </defs>
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="9" />
      <circle
        cx="46" cy="46" r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 46 46)"
      />
      <image href="/synk-bolt.png" x="20" y="20" width="52" height="52" />
    </svg>
  )
}

// 카테고리별 미션 그룹
function MissionTab({ data, isLoading }: { data: CollectionListResponse | null; isLoading: boolean }) {
  const navigate = useNavigate()

  if (isLoading) return <Loading />
  if (!data || data.missions.length === 0) {
    return <p className={styles.emptyText}>아직 완료한 미션이 없어요</p>
  }

  // 카테고리별 그룹핑
  const groups = CATEGORIES.map((cat) => ({
    cat,
    missions: data.missions.filter((m) => getCategory(m.missionId).id === cat.id),
  })).filter((g) => g.missions.length > 0)

  return (
    <>
      {groups.map(({ cat, missions }) => (
        <div key={cat.id} className={styles.categoryGroup}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryTag} style={{ background: cat.color + '26', color: cat.color }}>
              {cat.label}
            </span>
            <span className={styles.categoryCount}>{missions.length} / {data.totalCount} 미션 완료</span>
          </div>
          <div className={styles.missionGrid}>
            {missions.map((mission: CollectionMissionItem) => (
              <button
                key={mission.missionId}
                className={styles.missionTile}
                onClick={() => navigate(ROUTES.COLLECTION_DETAIL(mission.missionId))}
              >
                <div className={styles.tileThumbWrap}>
                  <div className={styles.tileThumb} style={{ background: missionGradient(mission.title) }}>
                    <img src="/synk-bolt.png" alt="" className={styles.tileThumbLogo} />
                  </div>
                  <span className={styles.tileCheck}>✓</span>
                </div>
                <span className={styles.tileTitle}>{mission.title}</span>
                <span className={styles.tileMeta}>완료 {mission.completedTimes}회</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function ThumbSlot({ thumbnail, large, extra = 0 }: { thumbnail?: string; large?: boolean; extra?: number }) {
  return (
    <div className={large ? styles.thumbSlotLarge : styles.thumbSlotSmall}>
      {thumbnail ? (
        <img src={thumbnail} alt="" className={styles.thumbImg} />
      ) : (
        <div className={styles.thumbPlaceholder}>
          <svg width={large ? 20 : 12} height={large ? 20 : 12} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          </svg>
          {extra > 0 && <div className={styles.thumbMore}>+{extra}</div>}
        </div>
      )}
    </div>
  )
}

// Synklog 카드
function SynklogCard({ item }: { item: MySynklogItem }) {
  const hasVideo = !!item.videoUrl

  return (
    <div className={styles.synklogCard}>
      <div className={styles.synklogAccent} />
      <div className={styles.synklogBody}>
        {/* 썸네일 스트립 — 큰 1개 + 작은 2개 세로 스택 */}
        <div className={styles.thumbStrip}>
          {/* 큰 썸네일 */}
          <ThumbSlot thumbnail={item.thumbnails[0]} large />
          {/* 작은 썸네일 2개 세로 스택 */}
          <div className={styles.thumbSmallCol}>
            <ThumbSlot thumbnail={item.thumbnails[1]} />
            <ThumbSlot thumbnail={item.thumbnails[2]} extra={item.collageCount > 3 ? item.collageCount - 3 : 0} />
          </div>
        </div>

        {/* 텍스트 + 버튼 */}
        <div className={styles.synklogInfo}>
          <div className={styles.synklogMeta}>
            <span className={styles.synklogDate}>{item.date}</span>
            <span className={styles.synklogBadge}>SYNKLOG</span>
          </div>
          <span className={styles.synklogRoomLine}>
            {item.roomName} · 콜라주 {item.collageCount}개
          </span>
          {hasVideo ? (
            <div className={styles.videoBtnRow}>
              <a
                href={item.videoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.videoBtn}
              >
                <span className={styles.videoBtnIcon}>▶</span>
                영상 보기
              </a>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => downloadVideo(item.videoUrl!, `synklog-${item.date}.mp4`)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                저장
              </button>
            </div>
          ) : (
            <span className={styles.videoBtnDisabled}>
              <span className={styles.videoBtnIcon}>▶</span>
              영상 보기
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

async function fetchMySynklogs(): Promise<MySynklogItem[]> {
  // 1. 내 방 목록
  const roomsRes = await roomApi.getMyRooms()
  const allRooms = roomsRes.data.active

  // 2. 각 방의 앨범(날짜) 목록 병렬 조회
  const albumResults = await Promise.allSettled(
    allRooms.map(async (room) => ({
      room,
      albums: (await albumApi.getAlbums(room.id)).data,
    }))
  )

  // 3. (방, 날짜) 쌍 수집
  const pairs: Array<{ roomId: number; roomName: string; date: string }> = []
  for (const result of albumResults) {
    if (result.status === 'fulfilled') {
      const { room, albums } = result.value
      for (const album of albums) {
        // AlbumItem.date = "YYYY.MM.DD" → API param = "YYYY-MM-DD"
        pairs.push({ roomId: room.id, roomName: room.name, date: album.date.replace(/\./g, '-') })
      }
    }
  }

  // 4. 각 (방, 날짜)의 synklog + collages 병렬 조회
  const synklogResults = await Promise.allSettled(
    pairs.map(async ({ roomId, roomName, date }) => {
      const [synklogRes, collagesRes] = await Promise.allSettled([
        albumApi.getSynklog(roomId, date),
        albumApi.getCollages(roomId, date),
      ])
      if (synklogRes.status !== 'fulfilled') return null
      const s = synklogRes.value.data
      if (s.status !== 'COMPLETED') return null

      const collages = collagesRes.status === 'fulfilled'
        ? collagesRes.value.data.filter((c) => c.status === 'COMPLETED')
        : []
      const thumbnails = collages
        .map((c) => c.thumbnail)
        .filter((t): t is string => !!t)
        .slice(0, 3)

      return {
        synklogId:    s.synklogId,
        roomId,
        roomName,
        date:         s.date,
        collageCount: collages.length,
        thumbnails,
        videoUrl:     s.synklogVideoUrl ?? null,
        status:       s.status,
      } as MySynklogItem
    })
  )

  return synklogResults
    .filter((r): r is PromiseFulfilledResult<MySynklogItem> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value)
    .sort((a, b) => b.date.localeCompare(a.date))
}

function SynklogTab() {
  const [items, setItems] = useState<MySynklogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMySynklogs()
      .then(setItems)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <Loading />
  if (items.length === 0) {
    return <p className={styles.emptyText}>아직 생성된 Synklog가 없어요</p>
  }

  return (
    <>
      <div className={styles.synklogListHeader}>
        <span className={styles.synklogListCount}>총 {items.length}개의 Synklog</span>
        <span className={styles.synklogListSort}>최신순</span>
      </div>
      <div className={styles.synklogList}>
        {items.map((item) => (
          <SynklogCard key={item.synklogId} item={item} />
        ))}
      </div>
    </>
  )
}

export default function CollectionPage() {
  const [tab, setTab] = useState<TabType>('mission')
  const [data, setData] = useState<CollectionListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    collectionApi
      .getMyCollection()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <AppHeader subtitle="내가 모은 미션 도감" />

      <div className={styles.scroll}>
        {/* 수집률 히어로 카드 */}
        <div className={styles.statsCard}>
          <div className={styles.statsInner}>
            <div className={styles.statsLeft}>
              <span className={styles.statsLabel}>수집률</span>
              <span className={styles.statsRate}>
                {isLoading ? '...' : `${data?.completionRate ?? 0}%`}
              </span>
              <span className={styles.statsCount}>
                {isLoading ? '—' : `${data?.completedCount ?? 0} / ${data?.totalCount ?? 0} 미션 완료`}
              </span>
            </div>
            <RingChart rate={isLoading ? 0 : (data?.completionRate ?? 0)} />
          </div>
          {/* 프로그레스 바 */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${isLoading ? 0 : (data?.completionRate ?? 0)}%` }}
            />
          </div>
        </div>

        {/* 탭 바 */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${tab === 'mission' ? styles.tabActive : ''}`}
            onClick={() => setTab('mission')}
          >
            완료한 미션
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'synklog' ? styles.tabActive : ''}`}
            onClick={() => setTab('synklog')}
          >
            내 Synklog
          </button>
        </div>

        {tab === 'mission'
          ? <MissionTab data={data} isLoading={isLoading} />
          : <SynklogTab />
        }
      </div>
    </div>
  )
}
