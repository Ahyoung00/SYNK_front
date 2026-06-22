/**
 * 앱 전역 온라인/오프라인 상태 (단일 소스).
 * - 브라우저 online/offline 이벤트
 * - 실제 API 요청의 네트워크 에러(fetch reject) → 즉시 오프라인
 *   (HTTP 에러는 서버가 응답한 것이므로 온라인으로 간주)
 */
type Listener = (online: boolean) => void

let online = typeof navigator === 'undefined' ? true : navigator.onLine
const listeners = new Set<Listener>()

export function getOnlineStatus(): boolean {
  return online
}

export function setOnlineStatus(next: boolean): void {
  if (online === next) return
  online = next
  listeners.forEach((l) => l(online))
}

export function subscribeOnlineStatus(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setOnlineStatus(false))
  window.addEventListener('online', () => setOnlineStatus(true))
}
