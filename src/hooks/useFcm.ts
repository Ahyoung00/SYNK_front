import { useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationType } from '@/types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

export function useFcm() {
  const prependNotification = useNotificationStore((s) => s.prependNotification)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    Notification.requestPermission().then((permission) => {
      if (permission !== 'granted') return
      registerAndSendToken()
    })

    const unsubscribe = onMessage(messaging, (payload) => {
      const data = payload.data ?? {}
      const appNotif = mapToAppNotification(data)
      if (appNotif) prependNotification(appNotif)

      if (payload.notification) {
        new Notification(payload.notification.title ?? '', {
          body: payload.notification.body,
          icon: '/icon-192.png',
        })
      }
    })

    return unsubscribe
  }, [token]) // token이 생기면 (로그인 직후) FCM 등록 실행
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
