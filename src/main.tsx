import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@/styles/global.css'

// iOS PWA: CSS 뷰포트 단위(dvh/vh/%)가 실제 화면과 어긋나는 문제 →
// JS로 실제 보이는 높이(window.innerHeight)를 --app-height에 직접 주입
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
  document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)
window.addEventListener('pageshow', setAppHeight)
window.visualViewport?.addEventListener('resize', setAppHeight)

// 화면 세로 고정 (회전 자체 차단) — 지원 환경(Android/설치 PWA)에서 동작, 미지원 시 매니페스트에 의존
;(screen as any).orientation?.lock?.('portrait').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
