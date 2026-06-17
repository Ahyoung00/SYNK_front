import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFcm } from '@/hooks/useFcm'

/** Redirects unauthenticated users to /login */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  useFcm()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
