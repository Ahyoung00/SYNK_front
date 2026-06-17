import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/** Redirects unauthenticated users to /login */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
