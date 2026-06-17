import { useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import { useNotificationStore } from '@/store/notificationStore'
import { userApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationType } from '@/types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

export function useFcm() {
  const prependNotification = useNotificationStore((s) => s.prependNotification)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    Notification.requestPermission().then((permission) => {
      if (permission !== 'granted') return
      registerAndSendToken()
    })

    // 포그라운드 메시지 수신
    const unsubscribe = onMessage(messaging, (payload) => {
      const data = payload.data ?? {}
      const appNotif = mapToAppNotification(data)
      if (appNotif) prependNotification(appNotif)

      // 브라우저 Notification API로 배너 표시
      if (payload.notification) {
        new Notification(payload.notification.title ?? '', {
          body: payload.notification.body,
          icon: '/icons/icon-192.png',
        })
      }
    })

    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

async function registerAndSendToken() {
  try {
    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (token) {
      await userApi.updateFcmToken(token)
    }
  } catch (err) {
    console.error('[FCM] 토큰 등록 실패:', err)
  }
}

function mapToAppNotification(data: Record<string, string>): AppNotification | null {
  if (!data.type) return null
  return {
    id: Number(data.id ?? Date.now()),
    type: data.type as NotificationType,
    title: data.title ?? '',
    content: data.content ?? '',
    relatedId: data.related_id ? Number(data.related_id) : null,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
}
