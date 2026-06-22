import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@/styles/global.css'

// iOS PWA: CSS 뷰포트 단위(dvh/vh/%)가 실제 화면과 어긋나는 문제 →
// JS로 실제 보이는 높이(window.innerHeight)를 --app-height에 직접 주입
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)
window.addEventListener('pageshow', setAppHeight)
window.visualViewport?.addEventListener('resize', setAppHeight)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
