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
  // ── 1. push 이벤트 수신 확인 로그
  console.log('[SW] push 이벤트 수신. e.data 존재:', !!e.data)

  // iOS 웹푸시 규칙: push를 받으면 반드시 사용자에게 보이는 알림을 띄워야 함.
  // 알림 없이 넘어가면 무음 푸시로 카운트되고, 누적 시 iOS가 푸시 전달을 차단함.
  if (!e.data) {
    console.warn('[SW] push 이벤트에 data 없음 — 기본 알림 표시')
    e.waitUntil(self.registration.showNotification('SYNK', { icon: '/icon-192.png' }))
    return
  }

  let title = 'SYNK'
  let body = ''
  let d: Record<string, string> = {}

  try {
    const raw = e.data.json()
    // ── 2. payload 구조 로그 (디버깅용)
    console.log('[SW] push payload (raw):', JSON.stringify(raw))

    // FCM이 보내는 가능한 모든 구조 대응:
    //   { notification: { title, body }, data: { ... } }   ← FCM notification + data
    //   { data: { title, body, type, ... } }               ← FCM data-only
    //   { title, body, type, ... }                         ← 평면 구조
    d = raw.data ?? raw
    console.log('[SW] 파싱된 data 필드:', JSON.stringify(d))

    const fmt = formatPush(d)
    if (fmt) {
      title = fmt.title
      body  = fmt.body
    } else {
      // formatPush가 null → 범용 폴백 (여러 depth 시도)
      title = d.title
            ?? raw.notification?.title
            ?? raw.title
            ?? title
      body  = d.body
            ?? d.content
            ?? raw.notification?.body
            ?? raw.body
            ?? body
    }
  } catch (err) {
    // JSON 파싱 실패 → text로 폴백
    console.warn('[SW] push payload JSON 파싱 실패, text 폴백:', err)
    body = e.data.text()
  }

  console.log('[SW] 표시할 알림 — title:', title, '/ body:', body)

  // iOS 웹푸시 규칙: 포그라운드 여부와 무관하게 항상 알림을 표시해야 함.
  // (예전에는 포그라운드 탭이 있으면 건너뛰었는데, 이게 무음 푸시로 누적되어
  //  iOS가 이 PWA로의 푸시 전달을 아예 차단하는 원인이었음)
  // 포그라운드 중복 표시는 useFcm onMessage 쪽의 수동 showNotification을 제거해서 방지.
  e.waitUntil(
    self.registration
      .showNotification(title, {
        body,
        icon: '/icon-192.png',
        data: d,
      })
      .then(() => {
        console.log('[SW] showNotification 성공')
      })
      .catch((err) => {
        console.error('[SW] showNotification 실패:', err)
      })
  )
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  const d = (e.notification.data ?? {}) as Record<string, string>

  let target = '/'
  if (d.type === 'CHAT' && d.roomId) {
    target = `/room/${d.roomId}/chat`
  } else if (d.type === 'MISSION_COMPLETE' && d.missionId) {
    target = `/result/${d.missionId}`
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      const c = cls.find((x) => 'focus' in x) as WindowClient | undefined
      if (c) { c.navigate(target); return c.focus() }
      return self.clients.openWindow(target)
    })
  )
})
