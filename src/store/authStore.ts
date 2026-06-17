import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import { STORAGE_KEYS } from '@/constants'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: User, token: string, refreshToken: string) => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, token, refreshToken) =>
        set({ user: { ...user, profileImage: toHttps(user.profileImage) }, token, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user: { ...user, profileImage: toHttps(user.profileImage) } }),

      setToken: (token) => set({ token }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN,
      storage: createJSONStorage(() => localStorage),
      // Only persist credentials, not loading state
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
