import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import type { CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import styles from './SynklogCompletePage.module.css'

interface LocationState {
  synklogId: number
  date: string
  selectedCollages: CollageItem[]
}

const POLL_INTERVAL = 3000
const POLL_TIMEOUT  = 5 * 60 * 1000

export default function SynklogCompletePage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const { state } = useLocation()
  const { date, selectedCollages = [] } = (state ?? {}) as Partial<LocationState>

  const [videoUrl, setVideoUrl]     = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)
  const [showPlayer, setShowPlayer] = useState(false)
  const videoRef  = useRef<HTMLVideoElement | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (!roomId || !date) return

    const poll = async () => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT) {
        clearInterval(timerRef.current!)
        setProcessing(false)
        return
      }
      try {
        const res = await albumApi.getSynklog(Number(roomId), date)
        if (res.data.status === 'COMPLETED' && res.data.synklogVideoUrl) {
          clearInterval(timerRef.current!)
          setVideoUrl(res.data.synklogVideoUrl)
          setProcessing(false)
        }
      } catch { /* 무시 */ }
    }

    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(timerRef.current!)
  }, [roomId, date])

  const dateLabel = date
    ? date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3')
    : ''

  function handleViewVideo() {
    if (!videoUrl) return
    setShowPlayer(true)
    setTimeout(() => videoRef.current?.play(), 100)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SYNK', text: '오늘의 SYNKLOG를 확인해보세요!' })
      } catch { /* 취소 */ }
    }
  }

  return (
    <div className={styles.page}>
      {/* 인라인 비디오 플레이어 오버레이 */}
      {showPlayer && videoUrl && (
        <div className={styles.playerOverlay} onClick={() => setShowPlayer(false)}>
          <video
            ref={videoRef}
            src={videoUrl}
            className={styles.playerVideo}
            controls
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
          <button className={styles.playerClose} onClick={() => setShowPlayer(false)}>✕</button>
        </div>
      )}

      <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      <div className={styles.inner}>
        {processing ? (
          /* ── 생성 중 상태 ── */
          <>
            <Loading label="SYNKLOG 생성 중" />
            <p className={styles.processingHint}>
              콜라주 영상을 이어붙이고 있어요. 잠시만 기다려주세요 🎬
            </p>
          </>
        ) : (
          /* ── 완료 상태 ── */
          <>
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
            <h1 className={styles.title}>오늘의 SYNKLOG가<br />완성됐어요!</h1>
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
          </>
        )}
      </div>
    </div>
  )
}
