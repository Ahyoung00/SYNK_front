import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

// Apply saved theme immediately on module load (prevents flash on refresh)
try {
  const raw = localStorage.getItem('synk_theme')
  if (raw) {
    const parsed = JSON.parse(raw)
    if (parsed?.state?.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }
} catch { /* ignore */ }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'synk_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
