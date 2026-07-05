import styles from './Loading.module.css'

interface LoadingProps {
  /** 안내 문구 (기본: "불러오는 중") */
  label?: string
  /** true일 때 라벨 영역을 숨김 */
  hideLabel?: boolean
}

/** SYNK 트랜지션 로더 — 회전하는 점 + 깜빡이는 번개 */
export default function Loading({ label = '불러오는 중', hideLabel = false }: LoadingProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.ldB}>
        <div className={styles.orb} />
        <div className={styles.glyph}>
          <svg viewBox="0 0 36 50" width="36" height="50" aria-hidden="true">
            <defs>
              <linearGradient id="ld-grad" x1="0" y1="0" x2="36" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--ld-cyan)" />
                <stop offset="0.5" stopColor="var(--ld-mid)" />
                <stop offset="1" stopColor="var(--ld-violet)" />
              </linearGradient>
            </defs>
            <path d="M22 2 L8 28 H17 L14 48 L30 22 H20 L22 2 Z" fill="url(#ld-grad)" />
          </svg>
        </div>
      </div>
      {!hideLabel && (
        <div className={styles.label}>
          {label}
          <span className={styles.dots}><i /><i /><i /></span>
        </div>
      )}
    </div>
  )
}
