import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from './AppLayout.module.css'

/** Tab layout: content area + bottom navigation bar */
export default function AppLayout() {
  return (
    <div className={styles.root}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
