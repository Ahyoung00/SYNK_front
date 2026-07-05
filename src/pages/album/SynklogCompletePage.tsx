import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import type { CollageItem } from '@/types'
import Loading from '@/components/ui/Loading'
import { downloadVideo } from '@/utils/downloadVideo'
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
    const shareUrl = roomId && date
      ? `${window.location.origin}/room/${roomId}/album/${date}`
      : window.location.href

    // 1) 영상 파일 자체 공유 시도 (카톡·인스타·저장 등)
    if (videoUrl) {
      try {
        const res  = await fetch(videoUrl)
        const blob = await res.blob()
        const file = new File([blob], `synklog-${date ?? 'video'}.mp4`, { type: blob.type || 'video/mp4' })
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'SYNK', text: '오늘의 SYNKLOG를 확인해보세요!' })
          return
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return // 사용자가 취소
        // 그 외(CORS 등) 실패 → 링크 공유로 폴백
      }
    }

    // 2) 링크 공유 폴백
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SYNK',
          text: '오늘의 SYNKLOG를 확인해보세요!',
          url: shareUrl,
        })
      } catch { /* 취소 */ }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('링크가 복사됐어요!')
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
          <div className={styles.playerTopBar}>
            <button className={styles.playerClose} onClick={() => setShowPlayer(false)}>✕</button>
            <button
              className={styles.playerDownload}
              onClick={(e) => { e.stopPropagation(); downloadVideo(videoUrl, 'synklog.mp4') }}
              aria-label="다운로드"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
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
            <Loading hideLabel />
            <h2 className={styles.processingTitle}>
              SYNKLOG 생성 중
              <span className={styles.processingDots}><i /><i /><i /></span>
            </h2>
            <p className={styles.processingHint}>
              콜라주 영상을 이어붙이고 있어요.<br />잠시만 기다려주세요 🎬
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

            {dateLabel && <p className={styles.dateLabel}>{dateLabel}</p>}
          </>
        ) : (
          /* ── 완료 상태 ── */
          <>
            {/* 앱 로고 */}
            <div className={styles.playIconWrap}>
              <img src="/icon-192.png" alt="SYNK" className={styles.appLogo} />
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
              <div className={styles.btnRow}>
                <button className={styles.secondaryBtn} onClick={handleShare}>
                  공유
                </button>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => videoUrl && downloadVideo(videoUrl, `synklog-${date ?? 'video'}.mp4`)}
                  disabled={!videoUrl}
                >
                  저장
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
