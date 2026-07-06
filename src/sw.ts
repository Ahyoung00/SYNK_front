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

  if (!e.data) {
    console.warn('[SW] push 이벤트에 data 없음 — 알림 표시 불가')
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

  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        console.log('[SW] 현재 열린 클라이언트 수:', clients.length,
          '/ visible 상태:', clients.map((c) => c.visibilityState))

        // visible인 탭이 있으면 포그라운드 onMessage가 담당 → SW 중복 방지
        // 단, 백그라운드(hidden) 탭만 있거나 클라이언트가 없으면 SW가 알림 표시
        const hasFocused = clients.some((c) => c.visibilityState === 'visible')
        if (hasFocused) {
          console.log('[SW] 포그라운드 탭 감지 — SW 알림 표시 건너뜀 (포그라운드 핸들러가 처리)')
          return
        }

        console.log('[SW] 백그라운드/종료 상태 — showNotification 호출')
        return self.registration
          .showNotification(title, {
            body,
            icon: '/icon-192.png',
            data: d,
          })
          .then(() => {
            console.log('[SW] showNotification 성공')
          })
          .catch((err) => {
            // ── 3. showNotification 실패 로그
            console.error('[SW] showNotification 실패:', err)
          })
      })
      .catch((err) => {
        // matchAll 자체가 실패할 경우에도 알림은 표시
        console.error('[SW] clients.matchAll 실패, 직접 showNotification 시도:', err)
        return self.registration
          .showNotification(title, { body, icon: '/icon-192.png', data: d })
          .catch((e2) => console.error('[SW] showNotification 최종 실패:', e2))
      })
  )
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  const d = (e.notification.data ?? {}) as Record<string, string>

  let target = '/'
  if (d.type === 'CHAT' && d.roomId) {
    target = `/room/${d.roomId}/chat`
  } else if (d.type === 'MISSION_COMPLETE' && d.roomId) {
    target = `/room/${d.roomId}/album`
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      const c = cls.find((x) => 'focus' in x) as WindowClient | undefined
      if (c) { c.navigate(target); return c.focus() }
      return self.clients.openWindow(target)
    })
  )
})
