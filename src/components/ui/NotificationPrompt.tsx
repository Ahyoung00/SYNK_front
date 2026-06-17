import { useState } from 'react'
import { requestNotificationPermission } from '@/hooks/useFcm'
import styles from './NotificationPrompt.module.css'

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(false)

  if (!visible) return null
  if (!('Notification' in window)) return null
  if (Notification.permission !== 'default') return null

  async function handleAllow() {
    setLoading(true)
    await requestNotificationPermission()
    setVisible(false)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>
        <p className={styles.emoji}>🔔</p>
        <p className={styles.title}>미션 알림을 받아보세요</p>
        <p className={styles.desc}>랜덤 미션이 울릴 때 바로 알려드릴게요</p>
        <button className={styles.allow} onClick={handleAllow} disabled={loading}>
          {loading ? '설정 중...' : '알림 허용하기'}
        </button>
        <button className={styles.deny} onClick={() => setVisible(false)}>
          나중에
        </button>
      </div>
    </div>
  )
}
