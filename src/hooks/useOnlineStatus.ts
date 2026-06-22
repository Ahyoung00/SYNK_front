import { useEffect, useState } from 'react'
import { getOnlineStatus, subscribeOnlineStatus } from '@/services/networkStatus'

/**
 * 앱 전역 온라인 상태 구독.
 * 브라우저 online/offline 이벤트 + 실제 API 요청의 네트워크 실패를 반영한다.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(getOnlineStatus)
  useEffect(() => subscribeOnlineStatus(setOnline), [])
  return online
}
