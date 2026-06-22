import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined
/** 도달 여부 확인용 핑 대상 (API 우선, 없으면 same-origin) */
const PING_URL = API_BASE ?? '/favicon.ico'
const INTERVAL = 15000

/**
 * 실제 서버 도달 가능 여부 기반 온라인 상태.
 * navigator.onLine/이벤트는 인터페이스 유무만 보므로(와이파이 O·인터넷 X 케이스를 못 잡음),
 * no-cors 핑으로 실제 연결을 능동 확인한다. (네트워크 실패 시에만 reject)
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    let active = true

    async function check() {
      // 인터페이스 자체가 끊겼으면 즉시 오프라인
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (active) setOnline(false)
        return
      }
      try {
        await fetch(`${PING_URL}?_=${Date.now()}`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
        })
        if (active) setOnline(true)
      } catch {
        if (active) setOnline(false)
      }
    }

    check()
    const onOnline = () => check()
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const id = window.setInterval(check, INTERVAL)

    return () => {
      active = false
      window.clearInterval(id)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return online
}
