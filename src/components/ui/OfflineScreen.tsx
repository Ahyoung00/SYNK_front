import styles from './OfflineScreen.module.css'

/** 인터넷 연결 끊김 전체 화면 */
export default function OfflineScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.iconTile}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8.5 15.8a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="19" r="1.3" fill="currentColor" />
            <line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#FF5A5F" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className={styles.title}>인터넷 연결이 끊겼어요</h1>
        <p className={styles.desc}>
          같은 순간을 담으려면 연결이 필요해요.<br />
          Wi-Fi 또는 데이터를 확인해 주세요.
        </p>

        <span className={styles.retryingPill}>
          <span className={styles.retryingDot} />
          재연결을 시도하고 있어요...
        </span>
      </div>

      <button className={styles.retryBtn} onClick={() => window.location.reload()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        다시 시도
      </button>
    </div>
  )
}
