import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './InfoPage.module.css'

const APP_VERSION = '0.1.0'

const INFO_ROWS: { label: string; value: string }[] = [
  { label: '앱 버전', value: `v${APP_VERSION}` },
  { label: '서비스명', value: 'SYNK' },
  { label: '개발', value: 'SYNK Team' },
]

export default function VersionPage() {
  const navigate = useNavigate()

  const LINKS: { label: string; to: string }[] = [
    { label: '이용약관', to: ROUTES.TERMS },
    { label: '개인정보 처리방침', to: ROUTES.PRIVACY },
    { label: '오픈소스 라이선스', to: ROUTES.LICENSE },
  ]

  return (
    <div className={styles.page}>
      <NavHeader title="버전 정보" />

      <div className={styles.scroll}>
        <div className={styles.appHeader}>
          <img src="/icon-192.png" alt="SYNK" className={styles.appIcon} />
          <p className={styles.appName}>SYNK</p>
          <p className={styles.appVersion}>v{APP_VERSION}</p>
        </div>

        <div className={styles.infoCard}>
          {INFO_ROWS.map((row, idx) => (
            <div key={row.label}>
              {idx > 0 && <div className={styles.infoDivider} />}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{row.label}</span>
                <span className={styles.infoValue}>{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.infoCard}>
          {LINKS.map((link, idx) => (
            <div key={link.label}>
              {idx > 0 && <div className={styles.infoDivider} />}
              <button className={styles.linkRow} onClick={() => navigate(link.to)}>
                <span className={styles.infoLabel}>{link.label}</span>
                <span className={styles.linkArrow}>›</span>
              </button>
            </div>
          ))}
        </div>

        <p className={styles.copyright}>© 2026 SYNK. All rights reserved.</p>
      </div>
    </div>
  )
}
