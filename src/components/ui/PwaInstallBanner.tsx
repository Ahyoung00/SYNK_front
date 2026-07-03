import { useEffect, useState } from 'react'
import styles from './PwaInstallBanner.module.css'

const DISMISSED_KEY = 'synk_pwa_install_dismissed'

type Mode = 'android' | 'ios' | null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [mode, setMode]               = useState<Mode>(null)
  const [deferredPrompt, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // 이미 설치됐으면 표시 안 함
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // 유저가 이미 닫은 경우
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const ua    = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !('MSStream' in window)

    if (isIOS) {
      // iOS Safari: beforeinstallprompt 없음 → 수동 안내
      const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS/i.test(ua)
      if (isSafari) setMode('ios')
      return
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('android')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setMode(null)
    setShowIosGuide(false)
  }

  async function handleInstall() {
    if (mode === 'android' && deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') dismiss()
      else setDeferred(null)
      setMode(null)
    } else if (mode === 'ios') {
      setShowIosGuide(true)
    }
  }

  if (!mode) return null

  return (
    <>
      {/* 배경 딤 (iOS 가이드 표시 시) */}
      {showIosGuide && <div className={styles.dim} onClick={dismiss} />}

      {/* 메인 배너 */}
      {!showIosGuide && (
        <div className={styles.sheet}>
          <div className={styles.handle} />
          <div className={styles.row}>
            <img src="/icon-192.png" alt="SYNK" className={styles.appIcon} />
            <div className={styles.info}>
              <p className={styles.appName}>SYNK</p>
              <p className={styles.appDesc}>친구들과 하루를 기록하는 앱</p>
            </div>
          </div>
          <button className={styles.installBtn} onClick={handleInstall}>
            {mode === 'ios' ? '홈 화면에 추가하기' : '앱 설치하기'}
          </button>
          <button className={styles.laterBtn} onClick={dismiss}>나중에</button>
        </div>
      )}

      {/* iOS 수동 안내 시트 */}
      {showIosGuide && (
        <div className={styles.guideSheet}>
          <div className={styles.handle} />
          <p className={styles.guideTitle}>홈 화면에 추가하는 방법</p>

          <div className={styles.guideStep}>
            <div className={styles.stepIcon}>
              <ShareIcon />
            </div>
            <div>
              <p className={styles.stepTitle}>Safari 하단 공유 버튼 탭</p>
              <p className={styles.stepDesc}>화면 아래 가운데 ↑ 아이콘을 탭하세요</p>
            </div>
          </div>

          <div className={styles.guideStep}>
            <div className={styles.stepIcon}>
              <PlusIcon />
            </div>
            <div>
              <p className={styles.stepTitle}>"홈 화면에 추가" 선택</p>
              <p className={styles.stepDesc}>메뉴에서 <strong>"홈 화면에 추가"</strong>를 탭하면 완료!</p>
            </div>
          </div>

          <button className={styles.installBtn} onClick={dismiss}>확인</button>
        </div>
      )}
    </>
  )
}

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}
