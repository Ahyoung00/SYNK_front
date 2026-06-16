import { useState, useRef, useEffect } from 'react'
import styles from './TimePicker.module.css'

interface Props {
  value: string        // "HH:mm" 24시간 형식
  onChange: (value: string) => void
}

function to12h(time24: string) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 === 0 ? 12 : h % 12
  return { ampm, hour, minute: m }
}

function to24h(ampm: string, hour: number, minute: number) {
  let h = hour % 12
  if (ampm === '오후') h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const HOURS   = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

export default function TimePicker({ value, onChange }: Props) {
  const { ampm, hour, minute } = to12h(value)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
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

  function select(newAmpm: string, newHour: number, newMinute: number) {
    onChange(to24h(newAmpm, newHour, newMinute))
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button ref={btnRef} className={styles.display} onClick={handleOpen}>
        <span className={styles.ampm}>{ampm}</span>
        <span className={styles.time}>
          {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} style={{ top: pos.top, left: pos.left }}>
          {/* 오전/오후 */}
          <div className={styles.col}>
            {['오전', '오후'].map((ap) => (
              <button
                key={ap}
                className={[styles.item, ampm === ap ? styles.active : ''].join(' ')}
                onClick={() => select(ap, hour, minute)}
              >
                {ap}
              </button>
            ))}
          </div>

          <div className={styles.divider} />

          {/* 시 */}
          <div className={styles.col}>
            {HOURS.map((h) => (
              <button
                key={h}
                className={[styles.item, hour === h ? styles.active : ''].join(' ')}
                onClick={() => select(ampm, h, minute)}
              >
                {String(h).padStart(2, '0')}
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
                onClick={() => { select(ampm, hour, m); setOpen(false) }}
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
