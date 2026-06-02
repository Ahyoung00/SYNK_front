// App.tsx is intentionally minimal — routing is handled by react-router-dom.
// Global side-effects (push notifications, app state listeners) live here.

import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  // Handle Android hardware back button via Capacitor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapApp.exitApp()
      }
    })

    return () => {
      listener.then((l) => l.remove())
    }
  }, [])

  return <RouterProvider router={router} />
}
