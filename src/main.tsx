import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@/styles/global.css'

// iOS PWA: CSS 뷰포트 단위(dvh/vh/%)가 실제 화면과 어긋나는 문제 →
// JS로 실제 보이는 높이(window.innerHeight)를 --app-height에 직접 주입
function setAppHeight() {
  // 앱은 항상 세로로 고정 → 긴 변을 높이, 짧은 변을 너비로 사용
  // (가로일 때 CSS로 세로 되돌림, 이 변수들이 세로 기준이어야 자식 레이아웃이 안 깨짐)
  const longSide = Math.max(window.innerWidth, window.innerHeight)
  const shortSide = Math.min(window.innerWidth, window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${longSide}px`)
  document.documentElement.style.setProperty('--app-width', `${shortSide}px`)
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
