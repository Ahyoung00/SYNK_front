import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { useNotificationStore } from '@/store/notificationStore'
import { userApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationType } from '@/types'

export function usePushNotification() {
  const navigate = useNavigate()
  const prependNotification = useNotificationStore((s) => s.prependNotification)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupNative()
    } else {
      setupWeb()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setupNative() {
    PushNotifications.requestPermissions().then(({ receive }) => {
      if (receive === 'granted') {
        PushNotifications.register()
      }
    })

    PushNotifications.addListener('registration', ({ value: token }) => {
      userApi.updateFcmToken(token).catch(console.error)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const appNotif = mapPushToAppNotification(notification.data)
      if (appNotif) prependNotification(appNotif)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      handleNotificationTap(notification.data)
    })
  }

  function setupWeb() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function mapPushToAppNotification(
    data: Record<string, string>,
  ): AppNotification | null {
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
        if (relatedId) navigate(ROUTES.ROOM_ALBUM(relatedId))
        break
      default:
        navigate(ROUTES.NOTIFICATIONS)
    }
  }
}
