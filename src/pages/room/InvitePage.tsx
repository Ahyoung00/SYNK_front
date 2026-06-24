import { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { roomApi } from '@/services/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import styles from './InvitePage.module.css'

function isKakaoInAppBrowser() {
  return /KAKAOTALK/i.test(navigator.userAgent)
}

function isAndroid() {
  return /android/i.test(navigator.userAgent)
}

export default function InvitePage() {
  const { code }   = useParams<{ code: string }>()
  const navigate   = useNavigate()
  const isLoggedIn = useAuthStore((s) => !!s.token)

  const [joining, setJoining]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showInAppBanner, setShowInAppBanner] = useState(false)

  useEffect(() => {
    if (!isKakaoInAppBrowser()) return

    if (isAndroid()) {
      // Android: intent:// 스킴으로 Chrome에서 강제 오픈
      const currentUrl = window.location.href
      const host = window.location.host
      const path = window.location.pathname + window.location.search
      window.location.href =
        `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`
    } else {
      // iOS: 자동 리다이렉트 불가 → 안내 배너 표시
      setShowInAppBanner(true)
    }
  }, [])

  if (!isLoggedIn) {
    return <Navigate to={ROUTES.LOGIN} state={{ redirectTo: `/invite/${code}` }} replace />
  }

  async function handleJoin() {
    if (!code || joining) return
    setJoining(true)
    setError(null)
    try {
      const res = await roomApi.joinRoom(code)
      navigate(ROUTES.ROOM(res.data.roomId), { replace: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '방 참여에 실패했어요. 코드를 확인해주세요.')
      setJoining(false)
    }
  }

  return (
    <div className={styles.page}>
      {showInAppBanner && (
        <div className={styles.inAppBanner}>
          <span>카카오톡 내에서는 앱이 열리지 않아요.</span>
          <span>우측 하단 <strong>···</strong> → <strong>Safari로 열기</strong>를 눌러주세요.</span>
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.icon}>🔗</div>
        <h2 className={styles.title}>SYNK 초대</h2>
        <p className={styles.desc}>
          초대 코드 <strong className={styles.code}>{code}</strong>로<br />방에 참여할까요?
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.joinBtn}
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? '참여 중...' : '참여하기'}
        </button>
        <button className={styles.cancelBtn} onClick={() => navigate(ROUTES.ROOMS)}>
          취소
        </button>
      </div>
    </div>
  )
}
