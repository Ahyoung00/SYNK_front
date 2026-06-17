/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e: ExtendableEvent) => {
  console.log('sw activate..')
  e.waitUntil(self.clients.claim())
})

self.addEventListener('push', (e: PushEvent) => {
  if (!e.data) return
  const data = e.data.json()
  const notification = data.notification ?? {}
  if (!notification.title) return

  console.log('미션 시작!', { body: notification.body })

  e.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
