import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { useNotificationStore } from '@/store/notificationStore'
import type { AppNotification, NotificationType } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// usePushNotification
//
// Call once at the top of the app (e.g. inside <App>).
// On native: registers Capacitor PushNotifications, requests permission,
//            and handles incoming / tap events.
// On web:    falls back to the Notification API.
// ─────────────────────────────────────────────────────────────────────────────

export function usePushNotification() {
  const navigate = useNavigate()
  const prependNotification = useNotificationStore((s) => s.prependNotification)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupNative()
    } else {
      setupWeb()
    }
    // No cleanup needed; listeners live for the app lifetime
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Native (Capacitor) ────────────────────────────────────────────────────

  function setupNative() {
    PushNotifications.requestPermissions().then(({ receive }) => {
      if (receive === 'granted') {
        PushNotifications.register()
      }
    })

    PushNotifications.addListener('registration', ({ value: token }) => {
      // Send FCM token to Spring Boot backend
      fetch('/api/auth/fcm-token', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token }),
      }).catch(console.error)
    })

    // Notification received while app is open
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const appNotif = mapPushToAppNotification(notification.data)
      if (appNotif) prependNotification(appNotif)
    })

    // User tapped a notification
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      handleNotificationTap(notification.data)
    })
  }

  // ── Web fallback ──────────────────────────────────────────────────────────

  function setupWeb() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function mapPushToAppNotification(
    data: Record<string, string>,
  ): AppNotification | null {
    if (!data.type) return null
    return {
      id: Number(data.id ?? Date.now()),
      user_id: 0,
      type: data.type as NotificationType,
      title: data.title ?? '',
      content: data.content ?? '',
      related_id: data.related_id ? Number(data.related_id) : undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    }
  }

  function handleNotificationTap(data: Record<string, string>) {
    const type = data.type as NotificationType
    const relatedId = data.related_id ? Number(data.related_id) : null

    switch (type) {
      case 'MISSION_START':
        if (relatedId) navigate(ROUTES.MISSION_DETAIL(relatedId))
        break
      case 'MISSION_COMPLETE':
        if (relatedId) navigate(ROUTES.MISSION_RESULT(relatedId))
        break
      case 'SYNKLOG_CREATED':
        // related_id is room_id
        if (relatedId) navigate(ROUTES.ROOM_ALBUM(relatedId))
        break
      default:
        navigate(ROUTES.NOTIFICATIONS)
    }
  }
}
