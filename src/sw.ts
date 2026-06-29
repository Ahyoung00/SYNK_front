/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e: ExtendableEvent) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('push', (e: PushEvent) => {
  console.log('[SW] push event received', e.data ? 'has data' : 'no data')

  let title = 'SYNK'
  let body = ''

  if (e.data) {
    try {
      const data = e.data.json()
      console.log('[SW] push payload:', JSON.stringify(data))
      // FCM이 보낼 수 있는 여러 형태(notification / data / 최상위 필드)를 모두 처리
      title =
        data.notification?.title ??
        data.data?.title ??
        data.title ??
        title
      body =
        data.notification?.body ??
        data.data?.body ??
        data.body ??
        body
    } catch (err) {
      console.error('[SW] push payload JSON 파싱 실패:', err)
      try {
        body = e.data.text()
      } catch (textErr) {
        console.error('[SW] push payload 텍스트 파싱도 실패:', textErr)
      }
    }
  }

  e.waitUntil(
    self.registration
      .showNotification(title, {
        body,
        icon: '/icon-192.png',
      })
      .then(() => console.log('[SW] showNotification 성공'))
      .catch((err) => console.error('[SW] showNotification 실패:', err))
  )
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
