import { useState } from 'react'
import { requestNotificationPermission } from '@/hooks/useFcm'
import styles from './NotificationPrompt.module.css'

const STORAGE_KEY = 'synk_notification_asked'

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(() => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return false
    if (localStorage.getItem(STORAGE_KEY)) return false
    return true
  })

  if (!visible) return null

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    await requestNotificationPermission()
  }

  function handleDeny() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>
        <p className={styles.emoji}>🔔</p>
        <p className={styles.title}>미션 알림을 받아보세요</p>
        <p className={styles.desc}>랜덤 미션이 울릴 때 바로 알려드릴게요</p>
        <button className={styles.allow} onClick={handleAllow}>
          알림 허용하기
        </button>
        <button className={styles.deny} onClick={handleDeny}>
          나중에
        </button>
      </div>
    </div>
  )
}
