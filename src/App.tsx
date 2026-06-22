import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import OfflineScreen from './components/ui/OfflineScreen'

export default function App() {
  const online = useOnlineStatus()
  return (
    <>
      <RouterProvider router={router} />
      {!online && <OfflineScreen />}
    </>
  )
}
