import styles from './Loading.module.css'

interface LoadingProps {
  /** 안내 문구 (기본: "불러오는 중...") */
  label?: string
}

/** 앱 아이콘을 활용한 로딩 인디케이터 */
export default function Loading({ label = '불러오는 중...' }: LoadingProps) {
  return (
    <div className={styles.wrap}>
      <img src="/icon-192.png" alt="" className={styles.icon} />
      <p className={styles.label}>{label}</p>
    </div>
  )
}
