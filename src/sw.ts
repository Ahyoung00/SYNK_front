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
  if (!e.data) return

  let title = 'SYNK'
  let body = ''

  try {
    const data = e.data.json()
    title = data.notification?.title ?? data.title ?? title
    body = data.notification?.body ?? data.body ?? body
  } catch {
    body = e.data.text()
  }

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
