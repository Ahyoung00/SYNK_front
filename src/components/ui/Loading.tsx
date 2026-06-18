import { useThemeStore } from '@/store/themeStore'
import styles from './Loading.module.css'

interface LoadingProps {
  /** 안내 문구 (기본: "불러오는 중...") */
  label?: string
}

/** 앱 아이콘을 활용한 로딩 인디케이터 */
export default function Loading({ label = '불러오는 중...' }: LoadingProps) {
  const theme = useThemeStore((s) => s.theme)
  // 라이트 모드: 흰 배경 아이콘 / 다크 모드: 어두운 배경 아이콘
  const icon = theme === 'light' ? '/icon-light.png' : '/icon-192.png'
  return (
    <div className={styles.wrap}>
      <img src={icon} alt="" className={styles.icon} />
      <p className={styles.label}>{label}</p>
    </div>
  )
}
