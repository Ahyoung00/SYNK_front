import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFcm } from '@/hooks/useFcm'

/** Redirects unauthenticated users to /onboarding (first time) or /login */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location        = useLocation()
  useFcm()
  if (isAuthenticated) return <Outlet />
  const redirectTo = location.pathname + location.search
  return <Navigate to="/onboarding" state={{ redirectTo }} replace />
}
