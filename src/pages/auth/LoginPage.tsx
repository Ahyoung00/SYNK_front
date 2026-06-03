import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { api } from '@/services/api/client'
import { authApi, userApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { User } from '@/types'

// DEV 전용 — db.json users 목록
const DEV_USERS = [
  { id: 1, name: '아영' },
  { id: 2, name: '유현' },
  { id: 3, name: '지민' },
  { id: 4, name: '수현' },
  { id: 5, name: '대주' },
]

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const isDev     = import.meta.env.DEV
  const [loading, setLoading]       = useState<number | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'kakao' | 'google' | null>(null)
  const [oauthError,   setOauthError]   = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // 언마운트 시 남은 리스너/타이머 정리
  useEffect(() => () => { cleanupRef.current?.() }, [])

  // ── 카카오 code 처리 ──────────────────────────────────────────────────────
  async function handleKakaoCodeSuccess(code: string, redirectUri: string) {
    try {
      const loginRes = await authApi.kakaoLogin(code, redirectUri)
      const { token } = loginRes.data

      const tempUser: User = {
        userId: loginRes.data.userId,
        name: loginRes.data.name,
        profileImage: loginRes.data.profileImage,
        missionNotification: true,
        resultNotification: true,
        highlightNotification: true,
      }
      setAuth(tempUser, token, '')

      try {
        const meRes = await userApi.getMe()
        setAuth(meRes.data, token, '')
      } catch { /* loginRes 데이터로 진행 */ }

      useChatStore.getState().clearAll()
      navigate(ROUTES.HOME, { replace: true })
    } catch (e) {
      console.error(e)
      setOauthError('카카오 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }

  // ── 카카오 로그인 (OAuth 팝업 + postMessage) ──────────────────────────────
  function handleKakaoLogin() {
    if (oauthLoading) return
    const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY
    if (!kakaoKey) {
      setOauthError('카카오 앱 키가 설정되지 않았어요. (.env.local 확인)')
      return
    }

    setOauthLoading('kakao')
    setOauthError(null)

    const redirectUri = `${window.location.origin}/kakao-callback.html`
    const url = `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${kakaoKey}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code`

    const popup = window.open(url, 'kakaoLogin', 'width=450,height=600,scrollbars=yes')

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'kakao_oauth') return
      window.removeEventListener('message', onMessage)

      if (e.data.error) {
        setOauthError('카카오 로그인에 실패했어요.')
        setOauthLoading(null)
        return
      }
      handleKakaoCodeSuccess(e.data.code, redirectUri)
    }
    window.addEventListener('message', onMessage)

    // 팝업을 직접 닫으면 정리
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        window.removeEventListener('message', onMessage)
        setOauthLoading((v) => v === 'kakao' ? null : v)
      }
    }, 500)
  }

  // ── 구글 로그인 (OAuth 팝업 + postMessage) ────────────────────────────────
  function handleGoogleLogin() {
    if (oauthLoading) return
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!googleClientId) {
      setOauthError('Google 클라이언트 ID가 설정되지 않았어요. (.env 확인)')
      return
    }

    setOauthLoading('google')
    setOauthError(null)

    const redirectUri = `${window.location.origin}/google-callback.html`
    const url = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('email profile openid')}` +
      `&prompt=select_account`

    const popup = window.open(url, 'googleLogin', 'width=450,height=600,scrollbars=yes')

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'google_oauth') return
      window.removeEventListener('message', onMessage)

      if (e.data.error) {
        setOauthError('Google 로그인에 실패했어요.')
        setOauthLoading(null)
        return
      }
      handleGoogleCodeSuccess(e.data.code, redirectUri)
    }
    window.addEventListener('message', onMessage)

    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        window.removeEventListener('message', onMessage)
        cleanupRef.current = null
        setOauthLoading((v) => v === 'google' ? null : v)
      }
    }, 500)

    cleanupRef.current = () => {
      clearInterval(timer)
      window.removeEventListener('message', onMessage)
    }
  }

  // ── 구글 code 처리 ──────────────────────────────────────────────────────
  async function handleGoogleCodeSuccess(code: string, redirectUri: string) {
    try {
      const loginRes = await authApi.googleLogin(code, redirectUri)
      const { token } = loginRes.data
      const tempUser: User = {
        userId: loginRes.data.userId,
        name: loginRes.data.name,
        profileImage: loginRes.data.profileImage,
        missionNotification: true,
        resultNotification: true,
        highlightNotification: true,
      }
      setAuth(tempUser, token, '')
      try {
        const meRes = await userApi.getMe()
        setAuth(meRes.data, token, '')
      } catch { /* loginRes 데이터로 진행 */ }
      useChatStore.getState().clearAll()
      navigate(ROUTES.HOME, { replace: true })
    } catch (e) {
      console.error(e)
      setOauthError('Google 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }
  async function handleDevLogin(userId: number) {
    if (loading !== null) return
    setLoading(userId)
    // 유저 전환 시 이전 유저의 채팅 캐시 초기화
    useChatStore.getState().clearAll()
    try {
      // 1) 유저 선택 로그인 → 토큰 발급
      const loginRes = await api.post<{
        token: string; userId: number; name: string; profileImage: string | null
      }>('/auth/dev-login', { userId })
      const { token } = loginRes.data

      // 2) 토큰을 임시 저장 후 /users/me 로 전체 프로필 로드
      //    (setAuth를 먼저 호출해야 이후 API 요청에 Authorization 헤더가 붙음)
      const tempUser: User = {
        userId,
        name:                  loginRes.data.name,
        profileImage:          loginRes.data.profileImage,
        missionNotification:   true,
        resultNotification:    true,
        highlightNotification: true,
      }
      setAuth(tempUser, token, `mock-refresh-${userId}`)

      // 3) /users/me 로 정확한 프로필로 덮어쓰기
      const meRes = await userApi.getMe()
      setAuth(meRes.data, token, `mock-refresh-${userId}`)

      navigate(ROUTES.HOME, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh',
      background: 'var(--color-login-bg, #e8e8e8)', color: 'var(--color-text)', gap: 16, padding: '0 24px',
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px' }}>SYNK</h1>
      <p style={{ color: 'var(--color-text-sub)', marginBottom: 32 }}>지금 이 순간을 함께</p>

      {oauthError && (
        <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', maxWidth: 280 }}>
          {oauthError}
        </p>
      )}

      {/* 카카오 로그인 */}
      <button
        onClick={handleKakaoLogin}
        disabled={!!oauthLoading}
        style={{
          width: '100%', maxWidth: 320, padding: '14px 24px',
          background: '#FEE500', color: '#191919', borderRadius: 12,
          fontWeight: 700, fontSize: 15,
          opacity: oauthLoading === 'google' ? 0.4 : 1,
          cursor: oauthLoading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {oauthLoading === 'kakao' ? '로그인 중...' : '카카오 로그인'}
      </button>

      {/* 구글 로그인 */}
      <button
        onClick={handleGoogleLogin}
        disabled={!!oauthLoading}
        style={{
          width: '100%', maxWidth: 320, padding: '14px 24px',
          background: '#fff', color: '#191919', borderRadius: 12,
          fontWeight: 700, fontSize: 15,
          opacity: oauthLoading === 'kakao' ? 0.4 : 1,
          cursor: oauthLoading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {oauthLoading === 'google' ? '로그인 중...' : 'Google 계정으로 로그인'}
      </button>

      {/* DEV 전용 — 유저 선택 로그인 */}
      {isDev && (
        <div style={{ marginTop: 40, width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              DEV — 유저 선택
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEV_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => handleDevLogin(u.id)}
                disabled={loading !== null}
                style={{
                  width: '100%', padding: '12px 20px',
                  background: loading === u.id
                    ? 'rgba(122, 181, 103, 0.25)'
                    : 'rgba(122, 181, 103, 0.1)',
                  border: '1px dashed rgba(122, 181, 103, 0.4)',
                  color: 'var(--color-primary)', borderRadius: 12,
                  fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: loading !== null && loading !== u.id ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(122,181,103,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0,
                }}>
                  {u.name.charAt(0)}
                </span>
                {loading === u.id ? '로그인 중...' : `${u.name}으로 로그인`}
              </button>
            ))}
          </div>

          <p style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            빌드 시 자동으로 사라짐
          </p>
        </div>
      )}
    </div>
  )
}
