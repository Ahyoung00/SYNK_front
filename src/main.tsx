import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@/styles/global.css'

// iOS PWA: CSS 뷰포트 단위(dvh/vh/%)가 실제 화면과 어긋나는 문제 →
// JS로 실제 보이는 높이(window.innerHeight)를 --app-height에 직접 주입
function currentAngle(): number {
  const a = (screen as any).orientation?.angle
  if (typeof a === 'number') return ((Math.round(a / 90) * 90) % 360 + 360) % 360
  const wo = (window as any).orientation
  if (typeof wo === 'number') return ((wo % 360) + 360) % 360
  return 0
}

function applyOrientation() {
  // 세로 고정용 뷰포트 변수: 항상 긴 변=높이, 짧은 변=너비
  const longSide = Math.max(window.innerWidth, window.innerHeight)
  const shortSide = Math.min(window.innerWidth, window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${longSide}px`)
  document.documentElement.style.setProperty('--app-width', `${shortSide}px`)
  // 실제 회전 각도를 심어 CSS가 정확히 반대로 되돌리게 함 (iOS Safari 세로 고정)
  document.documentElement.dataset.appAngle = String(currentAngle())
}
applyOrientation()
window.addEventListener('resize', applyOrientation)
window.addEventListener('orientationchange', applyOrientation)
window.addEventListener('pageshow', applyOrientation)
window.visualViewport?.addEventListener('resize', applyOrientation)
;(screen as any).orientation?.addEventListener?.('change', applyOrientation)

// Android/설치 PWA는 진짜 잠금 시도 (성공하면 위 각도는 0으로 유지됨)
;(screen as any).orientation?.lock?.('portrait').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
