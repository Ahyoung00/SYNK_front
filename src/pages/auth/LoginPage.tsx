import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { api } from '@/services/api/client'
import { authApi, userApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { User } from '@/types'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

const DEV_USERS = [
  { id: 1, name: '아영' },
  { id: 2, name: '유현' },
  { id: 3, name: '지민' },
  { id: 4, name: '수현' },
  { id: 5, name: '대주' },
]

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@900&display=swap');

  .login-page {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: radial-gradient(120% 60% at 50% 0%, #11183a 0%, #0a0e20 45%, #05070f 100%);
    font-family: 'Pretendard', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #F4F7FF;
  }

  .login-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    z-index: 0;
  }
  .login-glow-a {
    width: 360px; height: 360px;
    top: -60px; right: -140px;
    background: radial-gradient(circle, rgba(59,130,246,.55), transparent 70%);
  }
  .login-glow-b {
    width: 400px; height: 400px;
    bottom: 140px; left: -180px;
    background: radial-gradient(circle, rgba(123,92,255,.45), transparent 70%);
  }

  .login-grain {
    position: absolute;
    inset: 0;
    z-index: 1;
    opacity: .04;
    pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }

  .login-content {
    position: relative;
    z-index: 10;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top, 0);
  }

  .login-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 32px 32px;
  }

  .login-mark-wrap {
    position: relative;
    width: 140px;
    height: 140px;
    display: grid;
    place-items: center;
  }

  .login-mark-glow {
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(70,215,255,.4), rgba(123,92,255,.25) 45%, transparent 70%);
    filter: blur(14px);
    animation: loginBreathe 4.5s ease-in-out infinite;
  }

  .login-mark-img {
    position: relative;
    width: 110px;
    height: 110px;
    object-fit: cover;
    z-index: 2;
    mix-blend-mode: normal;
  }

  @keyframes loginBreathe {
    0%, 100% { opacity: .7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }

  .login-speed-lines {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: visible;
  }

  .login-speed-line {
    transform-origin: right center;
  }
  .login-speed-line-1 { animation: speedLine 2.2s ease-in-out infinite; }
  .login-speed-line-2 { animation: speedLine 2.2s ease-in-out 0.28s infinite; }
  .login-speed-line-3 { animation: speedLine 2.2s ease-in-out 0.56s infinite; }

  @keyframes speedLine {
    0%   { opacity: 0; transform: translateX(0) scaleX(0.3); }
    20%  { opacity: 1; transform: translateX(-8px) scaleX(1); }
    60%  { opacity: 0.6; transform: translateX(-18px) scaleX(1); }
    100% { opacity: 0; transform: translateX(-28px) scaleX(0.5); }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-mark-glow { animation: none; }
    .login-speed-line-1,
    .login-speed-line-2,
    .login-speed-line-3 { animation: none; opacity: 0; }
  }

  .login-wordmark {
    font-family: 'Archivo', sans-serif;
    font-weight: 900;
    font-size: 62px;
    letter-spacing: -0.02em;
    margin-top: 24px;
    background: linear-gradient(180deg, #ffffff 30%, #c9d4ff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
  }

  .login-slogan {
    margin-top: 16px;
    font-size: 15px;
    font-weight: 500;
    color: #8A93B2;
    letter-spacing: -0.01em;
  }
  .login-slogan b { color: #d7defb; font-weight: 600; }

  .login-pills {
    display: flex;
    gap: 8px;
    margin-top: 28px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .login-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    font-size: 13px;
    font-weight: 600;
    color: #c2cbe8;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .login-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: linear-gradient(135deg, #46D7FF, #8B5CF6);
    box-shadow: 0 0 8px rgba(70,215,255,.6);
    flex-shrink: 0;
  }

  .login-cta {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 28px calc(32px + env(safe-area-inset-bottom, 0));
  }

  .login-btn {
    height: 58px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    width: 100%;
    font-family: 'Pretendard', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    transition: transform .12s ease, filter .12s ease, opacity .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .login-btn:active { transform: scale(.985); }
  .login-btn:disabled { cursor: not-allowed; }

  .login-btn-kakao { background: #FEE500; color: #181600; }
  .login-btn-kakao:hover:not(:disabled) { filter: brightness(1.03); }

  .login-btn-google { background: #fff; color: #1f2430; }
  .login-btn-google:hover:not(:disabled) { filter: brightness(.98); }

  .login-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 2px;
    color: #5A6488;
    font-size: 12px;
    font-weight: 500;
  }
  .login-divider::before,
  .login-divider::after {
    content: '';
    height: 1px;
    flex: 1;
    background: rgba(255,255,255,.08);
  }

  .login-terms {
    margin-top: 4px;
    text-align: center;
    font-size: 11.5px;
    line-height: 1.6;
    color: #5A6488;
  }
  .login-terms a {
    color: #9aa4c6;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .login-error {
    font-size: 13px;
    color: #ef4444;
    text-align: center;
    max-width: 280px;
  }

  .login-dev-section {
    margin-top: 16px;
    width: 100%;
    max-width: 320px;
  }

  .login-dev-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .login-dev-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,.08);
  }

  .login-dev-label {
    font-size: 11px;
    color: #5A6488;
    white-space: nowrap;
  }

  .login-dev-btn {
    width: 100%;
    padding: 12px 20px;
    background: rgba(122,181,103,0.1);
    border: 1px dashed rgba(122,181,103,0.4);
    color: #7AB567;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-family: 'Pretendard', system-ui, sans-serif;
    transition: opacity .15s;
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 8px;
  }
  .login-dev-btn:disabled { cursor: not-allowed; }

  .login-dev-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(122,181,103,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #7AB567;
    flex-shrink: 0;
  }

  .login-dev-note {
    margin-top: 4px;
    font-size: 11px;
    color: #5A6488;
    text-align: center;
  }
`

export default function LoginPage() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const redirectTo    = (location.state as { redirectTo?: string } | null)?.redirectTo ?? ROUTES.HOME
  const setAuth       = useAuthStore((s) => s.setAuth)
  const isDev         = import.meta.env.DEV
  const [loading,      setLoading]      = useState<number | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'kakao' | 'google' | null>(null)
  const [oauthError,   setOauthError]   = useState<string | null>(null)

  useEffect(() => {
    const kakaoCode  = searchParams.get('kakao_code')
    const kakaoError = searchParams.get('kakao_error')
    const googleCode  = searchParams.get('google_code')
    const googleError = searchParams.get('google_error')

    if (!kakaoCode && !kakaoError && !googleCode && !googleError) return

    setSearchParams({}, { replace: true })

    const origin = window.location.origin
    if (kakaoCode) {
      setOauthLoading('kakao')
      handleKakaoCodeSuccess(kakaoCode, `${origin}/kakao-callback.html`)
    } else if (kakaoError) {
      setOauthError('카카오 로그인에 실패했어요. 다시 시도해주세요.')
    } else if (googleCode) {
      setOauthLoading('google')
      handleGoogleCodeSuccess(googleCode, `${origin}/google-callback.html`)
    } else if (googleError) {
      setOauthError('Google 로그인에 실패했어요. 다시 시도해주세요.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // OAuth 페이지에서 뒤로가기로 취소하면 bfcache로 복원되며 로딩 상태가
  // 'kakao'/'google'로 남아 버튼이 영구 disabled → 로그인 불가.
  // pageshow(persisted=뒤로가기 복원) 시 로딩 상태를 해제한다.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setOauthLoading(null)
        setLoading(null)
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function handleKakaoCodeSuccess(code: string, redirectUri: string) {
    try {
      const loginRes = await authApi.kakaoLogin(code, redirectUri)
      const { token, refreshToken = '' } = loginRes.data
      const user: User = {
        userId: loginRes.data.userId,
        name: loginRes.data.name,
        profileImage: toHttps(loginRes.data.profileImage),
        missionNotification: true,
        resultNotification: true,
        highlightNotification: true,
      }
      setAuth(user, token, refreshToken)
      useChatStore.getState().clearAll()
      navigate(redirectTo, { replace: true })
      userApi.getMe().then((r) => setAuth(r.data, token, refreshToken)).catch(() => {})
    } catch (e) {
      console.error(e)
      setOauthError('카카오 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }

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
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${kakaoKey}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code`
  }

  async function handleGoogleCodeSuccess(code: string, redirectUri: string) {
    try {
      const loginRes = await authApi.googleLogin(code, redirectUri)
      const { token, refreshToken = '' } = loginRes.data
      const user: User = {
        userId: loginRes.data.userId,
        name: loginRes.data.name,
        profileImage: toHttps(loginRes.data.profileImage),
        missionNotification: true,
        resultNotification: true,
        highlightNotification: true,
      }
      setAuth(user, token, refreshToken)
      useChatStore.getState().clearAll()
      navigate(redirectTo, { replace: true })
      userApi.getMe().then((r) => setAuth(r.data, token, refreshToken)).catch(() => {})
    } catch (e) {
      console.error(e)
      setOauthError('Google 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }

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
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('email profile openid')}` +
      `&prompt=select_account`
  }

  async function handleDevLogin(userId: number) {
    if (loading !== null) return
    setLoading(userId)
    useChatStore.getState().clearAll()
    try {
      const loginRes = await api.post<{
        token: string; userId: number; name: string; profileImage: string | null
      }>('/auth/dev-login', { userId })
      const { token } = loginRes.data
      const tempUser: User = {
        userId,
        name: loginRes.data.name,
        profileImage: loginRes.data.profileImage,
        missionNotification: true,
        resultNotification: true,
        highlightNotification: true,
      }
      setAuth(tempUser, token, `mock-refresh-${userId}`)
      const meRes = await userApi.getMe()
      setAuth(meRes.data, token, `mock-refresh-${userId}`)
      navigate(redirectTo, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="login-page">
        <div className="login-glow login-glow-a" />
        <div className="login-glow login-glow-b" />
        <div className="login-grain" />

        <div className="login-content">
          <div className="login-hero">
            <div className="login-mark-wrap">
              <div className="login-mark-glow" />
              <svg className="login-speed-lines" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="slGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#46D7FF" stopOpacity="0"/>
                    <stop offset="1" stopColor="#46D7FF" stopOpacity="0.85"/>
                  </linearGradient>
                </defs>
                <rect className="login-speed-line login-speed-line-1" x="2" y="58"  width="52" height="5" rx="2.5" fill="url(#slGrad)"/>
                <rect className="login-speed-line login-speed-line-2" x="0"  y="70"  width="62" height="5" rx="2.5" fill="url(#slGrad)"/>
                <rect className="login-speed-line login-speed-line-3" x="6"  y="82"  width="44" height="5" rx="2.5" fill="url(#slGrad)"/>
              </svg>
              <img src="/icon-light.png" alt="SYNK" className="login-mark-img" />
            </div>

            <div className="login-wordmark">SYNK</div>
            <div className="login-slogan">우리는 지금, <b>같은 순간</b>을 산다</div>

            <div className="login-pills">
              <span className="login-pill"><span className="login-pill-dot" />랜덤 미션</span>
              <span className="login-pill"><span className="login-pill-dot" />5분 안에</span>
              <span className="login-pill"><span className="login-pill-dot" />그룹 콜라주</span>
            </div>
          </div>

          <div className="login-cta">
            {oauthError && <p className="login-error">{oauthError}</p>}

            <button
              className="login-btn login-btn-kakao"
              onClick={handleKakaoLogin}
              disabled={!!oauthLoading}
              style={{ opacity: oauthLoading === 'google' ? 0.4 : 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.6 1.8 4.9 4.4 6.2-.2.6-.7 2.5-.8 2.9 0 0 0 .2.1.3.1 0 .2 0 .3-.1.4-.2 2.8-1.9 3.4-2.3.6.1 1.2.1 1.8.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3 12 3Z" fill="#181600"/>
              </svg>
              {oauthLoading === 'kakao' ? '로그인 중...' : '카카오로 시작하기'}
            </button>

            <button
              className="login-btn login-btn-google"
              onClick={handleGoogleLogin}
              disabled={!!oauthLoading}
              style={{ opacity: oauthLoading === 'kakao' ? 0.4 : 1 }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.1 3.5-8.8Z"/>
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24Z"/>
                <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1Z"/>
                <path fill="#EA4335" d="M12 4.7c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.7 12 4.7Z"/>
              </svg>
              {oauthLoading === 'google' ? '로그인 중...' : 'Google 계정으로 로그인'}
            </button>

            <div className="login-terms">
              가입 시 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에<br/>동의하게 됩니다.
            </div>

            {isDev && (
              <div className="login-dev-section">
                <div className="login-dev-divider">
                  <div className="login-dev-line" />
                  <span className="login-dev-label">DEV — 유저 선택</span>
                  <div className="login-dev-line" />
                </div>
                {DEV_USERS.map((u) => (
                  <button
                    key={u.id}
                    className="login-dev-btn"
                    onClick={() => handleDevLogin(u.id)}
                    disabled={loading !== null}
                    style={{
                      background: loading === u.id ? 'rgba(122,181,103,0.25)' : 'rgba(122,181,103,0.1)',
                      opacity: loading !== null && loading !== u.id ? 0.4 : 1,
                    }}
                  >
                    <span className="login-dev-avatar">{u.name.charAt(0)}</span>
                    {loading === u.id ? '로그인 중...' : `${u.name}으로 로그인`}
                  </button>
                ))}
                <p className="login-dev-note">빌드 시 자동으로 사라짐</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
