import { useNavigate, useLocation, useParams } from 'react-router-dom'
import type { CollageItem } from '@/types'
import { ROUTES } from '@/constants'
import styles from './SynklogCompletePage.module.css'

interface LocationState {
  synklogId: number
  date: string
  selectedCollages: CollageItem[]
}

export default function SynklogCompletePage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const { state } = useLocation()
  const { date, selectedCollages = [] } = (state ?? {}) as Partial<LocationState>

  const dateLabel = date
    ? date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3')
    : ''

  function handleViewVideo() {
    if (!date || !roomId) return
    navigate(ROUTES.ROOM_SYNKLOG(roomId, date))
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SYNK', text: '오늘의 Synklog를 확인해보세요!' })
      } catch { /* 취소 */ }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* 플레이 아이콘 */}
        <div className={styles.playIconWrap}>
          <div className={styles.playIconGlow} />
          <div className={styles.playIcon}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 완성 문구 */}
        <h1 className={styles.title}>오늘의 Synklog가<br />완성됐어요!</h1>
        <p className={styles.sub}>
          {selectedCollages.length}개의 콜라주가 하나의<br />추억 영상이 되었어요 ✨
        </p>

        {/* 선택한 콜라주 썸네일 row */}
        {selectedCollages.length > 0 && (
          <div className={styles.thumbRow}>
            {selectedCollages.slice(0, 4).map((c) => (
              <div key={c.missionId} className={styles.thumb}>
                {c.thumbnail
                  ? <img src={c.thumbnail} alt={c.missionTitle} className={styles.thumbImg} />
                  : <div className={styles.thumbEmpty} />
                }
              </div>
            ))}
          </div>
        )}

        {/* 날짜 */}
        {dateLabel && <p className={styles.dateLabel}>{dateLabel}</p>}

        {/* 버튼 */}
        <div className={styles.btns}>
          <button className={styles.primaryBtn} onClick={handleViewVideo}>
            영상 보기
          </button>
          <button className={styles.secondaryBtn} onClick={handleShare}>
            공유하기
          </button>
        </div>
      </div>
    </div>
  )
}
