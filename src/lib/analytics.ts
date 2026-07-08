// Google Analytics 4 (gtag.js) — 환경변수 VITE_GA_MEASUREMENT_ID 가 있을 때만 활성화

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

let initialized = false

/** gtag 스크립트를 로드하고 GA를 초기화한다. 측정 ID가 없으면 아무것도 하지 않음. */
export function initGA() {
  if (initialized || !GA_ID) return
  initialized = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // SPA는 라우터 변경 시 수동으로 page_view를 보내므로 자동 전송은 끔
  window.gtag('config', GA_ID, { send_page_view: false })
}

/** 현재 경로의 페이지뷰를 전송한다. */
export function trackPageview(path: string) {
  if (!GA_ID || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

/** 커스텀 이벤트 전송 (예: trackEvent('room_create', { max_members: 5 })) */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ID || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}
