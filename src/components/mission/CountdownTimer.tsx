import { useEffect, useRef } from 'react'
import { getTimerColor } from '@/constants'
import { formatTime } from '@/hooks/useTimer'
import styles from './CountdownTimer.module.css'

interface Props {
  secondsLeft: number
  /** 'sm' = 카메라 오버레이, 'lg' = 미션 상세 메인 */
  size?: 'sm' | 'lg'
  showLabel?: boolean
}

export function CountdownTimer({ secondsLeft, size = 'lg', showLabel = true }: Props) {
  const color = getTimerColor(secondsLeft)
  const isDanger = secondsLeft > 0 && secondsLeft < 60
  const isWarn = secondsLeft >= 60 && secondsLeft < 180
  const isExpired = secondsLeft <= 0

  const timeRef = useRef<HTMLSpanElement | null>(null)
  const prevSeconds = useRef(secondsLeft)

  // 숫자 바뀔 때마다 살짝 튕기는 애니메이션
  useEffect(() => {
    if (prevSeconds.current !== secondsLeft && timeRef.current) {
      timeRef.current.classList.remove(styles.tick)
      // reflow 유도
      void timeRef.current.offsetWidth
      timeRef.current.classList.add(styles.tick)
    }
    prevSeconds.current = secondsLeft
  }, [secondsLeft])

  return (
    <div
      className={[
        styles.wrap,
        styles[size],
        isDanger ? styles.danger : isWarn ? styles.warn : styles.safe,
      ].join(' ')}
    >
      {/* SVG 링 — lg 사이즈에서만 */}
      {size === 'lg' && (
        <TimerRing secondsLeft={secondsLeft} color={color} />
      )}

      <div className={styles.inner}>
        <span
          ref={timeRef}
          className={styles.time}
          style={{ color: isExpired ? 'rgba(255,255,255,0.3)' : color }}
        >
          {isExpired ? '00:00' : formatTime(secondsLeft)}
        </span>
        {showLabel && (
          <span className={styles.label}>
            {isExpired ? '시간 초과' : '남은 시간'}
          </span>
        )}
      </div>
    </div>
  )
}

// ── SVG 링 ────────────────────────────────────────────────────────────────────

function TimerRing({ secondsLeft, color }: { secondsLeft: number; color: string }) {
  const total = 300 // 5분
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, secondsLeft) / total
  const dashoffset = circumference * (1 - progress)

  return (
    <svg className={styles.ring} viewBox="0 0 160 160" aria-hidden="true">
      {/* 배경 트랙 */}
      <circle
        cx="80" cy="80" r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="6"
      />
      {/* 진행 링 */}
      <circle
        cx="80" cy="80" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          transition: 'stroke-dashoffset 0.9s linear, stroke 0.6s ease',
          filter: `drop-shadow(0 0 6px ${color}66)`,
        }}
      />
    </svg>
  )
}
