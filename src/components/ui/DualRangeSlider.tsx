import { useCallback, useRef } from 'react'
import styles from './DualRangeSlider.module.css'

interface Props {
  min: number
  max: number
  start: number
  end: number
  step?: number
  disabled?: boolean
  onStartChange: (v: number) => void
  onEndChange:   (v: number) => void
}

export default function DualRangeSlider({
  min, max, start, end, step = 1, disabled,
  onStartChange, onEndChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100

  const fillLeft  = `${toPercent(start)}%`
  const fillRight = `${100 - toPercent(end)}%`

  // 두 슬라이더 중 클릭 지점에 더 가까운 쪽에 z-index를 높여서
  // 올바른 thumb이 이벤트를 받도록 함
  const handleWrapPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !wrapRef.current) return
      const rect    = wrapRef.current.getBoundingClientRect()
      const pct     = (e.clientX - rect.left) / rect.width
      const val     = min + pct * (max - min)
      const distStart = Math.abs(val - start)
      const distEnd   = Math.abs(val - end)
      // 가까운 thumb의 slider를 위로 올림
      const startEl = wrapRef.current.querySelector<HTMLInputElement>('[data-thumb="start"]')
      const endEl   = wrapRef.current.querySelector<HTMLInputElement>('[data-thumb="end"]')
      if (startEl && endEl) {
        if (distStart <= distEnd) {
          startEl.style.zIndex = '3'
          endEl.style.zIndex   = '2'
        } else {
          startEl.style.zIndex = '2'
          endEl.style.zIndex   = '3'
        }
      }
    },
    [min, max, start, end, disabled],
  )

  return (
    <div className={styles.wrap} ref={wrapRef} onPointerDown={handleWrapPointer}>
      <div className={styles.track} />
      <div className={styles.fill} style={{ left: fillLeft, right: fillRight }} />
      <input
        data-thumb="start"
        type="range"
        className={styles.range}
        min={min} max={max} step={step}
        value={start}
        disabled={disabled}
        style={{ zIndex: 2 }}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v < end - step) onStartChange(v)
        }}
      />
      <input
        data-thumb="end"
        type="range"
        className={styles.range}
        min={min} max={max} step={step}
        value={end}
        disabled={disabled}
        style={{ zIndex: 3 }}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v > start + step) onEndChange(v)
        }}
      />
    </div>
  )
}
