import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import '@/styles/global.css'

function setVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
}
setVh()
window.addEventListener('resize', setVh)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
