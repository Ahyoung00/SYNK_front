import { useEffect, useRef } from 'react'
import type { CollageCellData } from '@/utils/mockCollage'
import { formatElapsed } from '@/utils/mockCollage'
import styles from './CollageCell.module.css'

interface Props {
  cell: CollageCellData
}

export function CollageCell({ cell }: Props) {
  const { user, videoUrl, missionStartAt, submittedAt, status, gradient } = cell
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // ── IntersectionObserver: 보이면 재생, 숨으면 일시정지 ──────────────────────
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {/* autoplay policy — 무시 */})
        } else {
          el.pause()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const submittedLabel =
    submittedAt ? `${formatElapsed(missionStartAt, submittedAt)} 제출` : null

  const initial = user.name.charAt(0)

  return (
    <div className={styles.cell}>

      {/* ── 배경: 실제 비디오 or 개발용 그라데이션 placeholder ─────────────── */}
      {videoUrl ? (
        <video
          ref={videoRef}
          className={styles.video}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      ) : (
        <div className={styles.placeholder} style={{ background: gradient }}>
          {/* 이니셜 아바타 */}
          <div className={styles.initialBubble}>
            <span className={styles.initialText}>{initial}</span>
          </div>
        </div>
      )}

      {/* ── 미참여 오버레이 ─────────────────────────────────────────────────── */}
      {status === 'missed' && (
        <div className={styles.missedOverlay}>
          <div className={styles.missedContent}>
            <span className={styles.missedIcon}>😶</span>
            <span className={styles.missedLabel}>미참여</span>
          </div>
        </div>
      )}

      {/* ── 하단 정보 그라데이션 오버레이 ──────────────────────────────────── */}
      <div className={styles.infoOverlay}>
        <span className={styles.memberName}>{user.name}</span>
        {submittedLabel && status !== 'missed' && (
          <span className={styles.submittedTime}>{submittedLabel}</span>
        )}
      </div>

    </div>
  )
}
