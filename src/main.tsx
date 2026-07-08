import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { router } from './router'
import { initGA, trackPageview } from '@/lib/analytics'
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
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || window.matchMedia('(pointer: coarse)').matches

  if (isMobile) {
    // 모바일: 세로 고정용 — 항상 긴 변=높이, 짧은 변=너비
    document.documentElement.style.setProperty('--app-height', `${Math.max(window.innerWidth, window.innerHeight)}px`)
    document.documentElement.style.setProperty('--app-width',  `${Math.min(window.innerWidth, window.innerHeight)}px`)
  } else {
    // 데스크탑(맥 등): 실제 뷰포트 그대로 사용
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    document.documentElement.style.setProperty('--app-width',  `${window.innerWidth}px`)
  }
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

// Google Analytics: 초기화 + SPA 라우터 이동마다 페이지뷰 전송
initGA()
let lastPath = window.location.pathname + window.location.search
trackPageview(lastPath)
router.subscribe((state) => {
  if (state.navigation.state !== 'idle') return
  const path = state.location.pathname + state.location.search
  if (path === lastPath) return
  lastPath = path
  trackPageview(path)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
