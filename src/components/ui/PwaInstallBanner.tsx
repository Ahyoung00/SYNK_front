import { useEffect, useState } from 'react'
import styles from './PwaInstallBanner.module.css'

const DISMISSED_KEY = 'synk_pwa_install_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isAndroidInApp() {
  const ua = navigator.userAgent
  return (
    /Android/i.test(ua) &&
    /KAKAOTALK|KAKAO|Line\/|Instagram|FBAN|FBAV|Twitter|Snapchat|Musical/i.test(ua)
  )
}

export default function PwaInstallBanner() {
  const [mode, setMode]             = useState<'native' | 'inapp' | null>(null)
  const [deferredPrompt, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    // Android 인앱 브라우저: beforeinstallprompt 안 뜨므로 수동 배너
    if (isAndroidInApp()) {
      setMode('inapp')
      return
    }

    // 일반 Android Chrome: 네이티브 설치 프롬프트
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('native')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setMode(null)
  }

  async function handleNativeInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferred(null)
    setMode(null)
  }

  if (!mode) return null

  // Android 인앱 브라우저: Chrome으로 열어 설치 안내
  if (mode === 'inapp') {
    return (
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.row}>
          <img src="/icon-192.png" alt="SYNK" className={styles.appIcon} />
          <div className={styles.info}>
            <p className={styles.appName}>SYNK 앱으로 즐기기</p>
            <p className={styles.appDesc}>Chrome에서 열면 홈 화면에 추가할 수 있어요</p>
          </div>
        </div>
        <div className={styles.inappSteps}>
          <div className={styles.inappStep}>
            <span className={styles.inappStepNum}>1</span>
            <span className={styles.inappStepText}>우측 상단 <strong>⋮</strong> 메뉴 탭</span>
          </div>
          <div className={styles.inappStep}>
            <span className={styles.inappStepNum}>2</span>
            <span className={styles.inappStepText}><strong>Chrome으로 열기</strong> 선택</span>
          </div>
          <div className={styles.inappStep}>
            <span className={styles.inappStepNum}>3</span>
            <span className={styles.inappStepText}>Chrome 주소창 우측 <strong>⋮ → 앱 설치</strong></span>
          </div>
        </div>
        <button className={styles.laterBtn} onClick={dismiss}>나중에</button>
      </div>
    )
  }

  // 일반 Chrome: 네이티브 설치 버튼
  return (
    <div className={styles.sheet}>
      <div className={styles.handle} />
      <div className={styles.row}>
        <img src="/icon-192.png" alt="SYNK" className={styles.appIcon} />
        <div className={styles.info}>
          <p className={styles.appName}>SYNK</p>
          <p className={styles.appDesc}>친구들과 하루를 기록하는 앱</p>
        </div>
      </div>
      <button className={styles.installBtn} onClick={handleNativeInstall}>앱 설치하기</button>
      <button className={styles.laterBtn} onClick={dismiss}>나중에</button>
    </div>
  )
}
