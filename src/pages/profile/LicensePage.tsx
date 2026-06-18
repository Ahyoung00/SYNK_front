import NavHeader from '@/components/layout/NavHeader'
import styles from './InfoPage.module.css'

const LICENSES: { name: string; license: string }[] = [
  { name: 'react', license: 'MIT' },
  { name: 'react-dom', license: 'MIT' },
  { name: 'react-router-dom', license: 'MIT' },
  { name: 'zustand', license: 'MIT' },
  { name: 'firebase', license: 'Apache-2.0' },
  { name: '@stomp/stompjs', license: 'Apache-2.0' },
  { name: 'sockjs-client', license: 'MIT' },
  { name: '@capacitor/core', license: 'MIT' },
  { name: '@capacitor/app', license: 'MIT' },
  { name: '@capacitor/camera', license: 'MIT' },
  { name: '@capacitor/haptics', license: 'MIT' },
  { name: '@capacitor/push-notifications', license: 'MIT' },
  { name: '@capacitor/status-bar', license: 'MIT' },
  { name: 'vite', license: 'MIT' },
]

export default function LicensePage() {
  return (
    <div className={styles.page}>
      <NavHeader title="오픈소스 라이선스" />

      <div className={styles.scroll}>
        <p className={styles.lead}>SYNK는 아래 오픈소스 라이브러리를 사용합니다</p>

        <div className={styles.infoCard}>
          {LICENSES.map((lib, idx) => (
            <div key={lib.name}>
              {idx > 0 && <div className={styles.infoDivider} />}
              <div className={styles.infoRow}>
                <span className={styles.infoValue}>{lib.name}</span>
                <span className={styles.infoLabel}>{lib.license}</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.copyright}>
          각 라이브러리의 전체 라이선스 전문은 해당 프로젝트의 저장소에서 확인할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
