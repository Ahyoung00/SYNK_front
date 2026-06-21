import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFcm } from '@/hooks/useFcm'

/** Redirects unauthenticated users to /onboarding (first time) or /login */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  useFcm()
  if (isAuthenticated) return <Outlet />
  const onboarded = localStorage.getItem('synk_onboarded')
  return <Navigate to={onboarded ? '/login' : '/onboarding'} replace />
}
