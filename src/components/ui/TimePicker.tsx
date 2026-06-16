import { useState, useRef, useEffect } from 'react'
import styles from './TimePicker.module.css'

interface Props {
  value: string        // "HH:mm" 24시간 형식
  onChange: (value: string) => void
}

function parse(time24: string) {
  const [h, m] = time24.split(':').map(Number)
  return { hour: h, minute: m }
}

function ampmLabel(hour: number) {
  return hour < 12 ? '오전' : '오후'
}

const HOURS   = Array.from({ length: 24 }, (_, i) => i)       // 0~23
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)   // 0,5,...,55

export default function TimePicker({ value, onChange }: Props) {
  const { hour, minute } = parse(value)
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0 })
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 6, left: rect.left })
    }
    setOpen((v) => !v)
  }

  function selectHour(h: number) {
    onChange(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }

  function selectMinute(m: number) {
    onChange(`${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    setOpen(false)
  }

  const displayHour = hour % 12 === 0 ? 12 : hour % 12

  return (
    <div className={styles.wrap} ref={ref}>
      <button ref={btnRef} className={styles.display} onClick={handleOpen}>
        <span className={styles.ampm}>{ampmLabel(hour)}</span>
        <span className={styles.time}>
          {String(displayHour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} style={{ top: pos.top, left: pos.left }}>
          {/* 시 (0~23) */}
          <div className={styles.col}>
            {HOURS.map((h) => (
              <button
                key={h}
                className={[styles.item, hour === h ? styles.active : ''].join(' ')}
                onClick={() => selectHour(h)}
              >
                <span className={styles.itemAmpm}>{ampmLabel(h)}</span>
                {String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}
              </button>
            ))}
          </div>

          <div className={styles.divider} />

          {/* 분 */}
          <div className={styles.col}>
            {MINUTES.map((m) => (
              <button
                key={m}
                className={[styles.item, minute === m ? styles.active : ''].join(' ')}
                onClick={() => selectMinute(m)}
              >
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
