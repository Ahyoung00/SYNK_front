import { useEffect } from 'react'
import { getToken, deleteToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { userApi } from '@/services/api/endpoints'
import type { AppNotification, NotificationType } from '@/types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

const LAST_TOKEN_KEY = 'fcm_diag_last_token'

/**
 * FCM 진단 로그 — 푸시가 끊기는 원인 추적용 (동작 변경 없음, 관찰만).
 * Mac Safari 웹 인스펙터 콘솔에서 `[FCM-DIAG]` 로 필터해서 확인.
 */
async function fcmDiag(phase: string, token?: string | null) {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    const now = Date.now()
    const expInfo = sub?.expirationTime != null
      ? `${new Date(sub.expirationTime).toISOString()}(${sub.expirationTime <= now ? '만료됨' : '유효'})`
      : sub ? '만료시각없음' : '구독없음'
    const last = localStorage.getItem(LAST_TOKEN_KEY)
    const short = (t?: string | null) => (t ? `${t.slice(0, 8)}…${t.slice(-6)}` : '없음')
    const changed = token != null && last != null && token !== last
    console.log(
      `[FCM-DIAG] ${phase} @ ${new Date(now).toISOString()}`,
      `\n  permission: ${Notification.permission}`,
      `\n  구독: ${sub ? '있음' : '없음'} / 만료: ${expInfo}`,
      `\n  endpoint: ${sub?.endpoint?.slice(-24) ?? '없음'}`,
      `\n  token: ${short(token)}${changed ? ' ← 이전과 다름(로테이션!)' : ''}`,
      `\n  직전토큰: ${short(last)}`,
    )
    if (token) localStorage.setItem(LAST_TOKEN_KEY, token)
  } catch (err) {
    console.warn('[FCM-DIAG] 상태 수집 실패:', err)
  }
}

// 사용자 제스처(버튼 클릭)에서 호출 — iOS PWA는 자동 호출 무시
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready

    // iOS PWA 유령 토큰 자가복구:
    // 재설치/구독 만료 시 실제 push 구독은 죽었는데 SDK가 IndexedDB에 캐시된
    // 옛 토큰을 계속 반환함 → 구독이 없으면 캐시 토큰을 폐기하고 새로 발급받는다.
    const existingSub = await registration.pushManager.getSubscription()
    if (!existingSub) {
      try {
        await deleteToken(messaging)
        console.log('[FCM] 죽은 구독 감지 — 캐시 토큰 폐기 후 재발급')
      } catch {
        /* 캐시된 토큰이 없으면 무시 */
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (token) {
      console.log('[FCM] 토큰:', token)
      await fcmDiag('토큰 발급/등록', token)
      await userApi.updateFcmToken(token)
      console.log('[FCM] 서버 등록 완료')
    } else {
      console.warn('[FCM] 토큰 발급 실패')
      await fcmDiag('토큰 발급 실패', null)
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
  const missionAlert = useSettingsStore((s) => s.missionAlert)

  useEffect(() => {
    if (!token) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // 이미 권한이 허용된 경우 자동으로 토큰 등록
    if (Notification.permission === 'granted') {
      requestNotificationPermission()
    }

    // 진단: 앱이 포그라운드로 돌아올 때마다 구독/토큰 상태 기록
    // (푸시가 끊긴 시점에 구독이 죽었는지·만료됐는지 확인용)
    function onForeground() {
      if (document.visibilityState === 'visible') {
        fcmDiag('포그라운드 복귀')
      }
    }
    document.addEventListener('visibilitychange', onForeground)

    const unsubscribe = onMessage(messaging, (payload) => {
      const data = payload.data ?? {}

      // 미션 알림이 꺼져 있으면 MISSION_START 알림을 표시하지 않음
      if (data.type === 'MISSION_START' && !missionAlert) return

      const appNotif = mapToAppNotification(data)
      if (appNotif) prependNotification(appNotif)

      // 시스템 알림 표시는 SW push 핸들러가 항상 담당 (iOS 무음 푸시 예산 대응).
      // 여기서 또 띄우면 중복이므로 인앱 알림 목록 갱신만 수행.
    })

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onForeground)
    }
  }, [token])
}

/** 푸시 data → 타입별 문구 재구성 (없으면 null → 백엔드 문구 사용) */
export function formatPush(data: Record<string, string>): { title: string; body: string } | null {
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
