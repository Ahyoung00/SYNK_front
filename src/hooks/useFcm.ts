import { useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationType } from '@/types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

// 사용자 제스처(버튼 클릭)에서 호출 — iOS PWA는 자동 호출 무시
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (token) {
      console.log('[FCM] 토큰:', token)
      await userApi.updateFcmToken(token)
      console.log('[FCM] 서버 등록 완료')
    } else {
      console.warn('[FCM] 토큰 발급 실패')
    }
    return true
  } catch (err) {
    console.error('[FCM] 오류:', err)
    return false
  }
}

export function useFcm() {
  const prependNotification = useNotificationStore((s) => s.prependNotification)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission !== 'granted') return

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
  }, [token])
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
