/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

/** 푸시 data → 타입별 문구 재구성 (useFcm.formatPush와 동일 규칙) */
function formatPush(data: Record<string, string> | undefined): { title: string; body: string } | null {
  if (!data) return null
  const content = data.content ?? data.body ?? ''
  if (data.type === 'MISSION_START') {
    const missionName = (content.split(' · ')[0] ?? '').trim()
    return {
      title: '⚡ 지금이야! 미션 도착',
      body: missionName ? `${missionName} · 5분 안에 찍어 올려요!` : '5분 안에 찍어 올려요!',
    }
  }
  return null
}

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
    // FCM 메시지(data 중첩) 또는 평면 구조 모두 대응
    const d = data.data ?? data
    const fmt = formatPush(d)
    title = fmt?.title ?? data.notification?.title ?? d.title ?? title
    body = fmt?.body ?? data.notification?.body ?? d.body ?? body
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
