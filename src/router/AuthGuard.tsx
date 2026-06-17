import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePushNotification } from '@/hooks/usePushNotification'

/** Redirects unauthenticated users to /login */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // JWT가 확보된 시점에 FCM 등록 및 알림 리스너 설정
  usePushNotification()

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
