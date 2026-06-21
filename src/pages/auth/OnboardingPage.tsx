import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { api } from '@/services/api/client'
import { authApi, userApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { User } from '@/types'
import styles from './OnboardingPage.module.css'

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

const SLIDES = [
  {
    label: '함께하는 순간',
    title: (styles: Record<string, string>) => (
      <>
        친구들과{' '}
        <span className={styles.titleGrad}>한 그룹</span>
        이 되면<br />같은 순간이 시작돼요
      </>
    ),
    desc: '방을 만들고 친구를 초대하면, 하루에 몇 번 랜덤한 시간에 미션이 도착해요.',
  },
  {
    label: '5분의 진심',
    title: (styles: Record<string, string>) => (
      <>
        미션이 오면{' '}
        <span className={styles.titleGrad}>5분 안에</span>
        <br />딱 한 컷이면 돼요
      </>
    ),
    desc: '꾸미지 않아도 괜찮아요. 지금 이 순간의 진짜 너를 담는 시간이니까.',
  },
  {
    label: '우리만의 기록',
    title: (styles: Record<string, string>) => (
      <>
        모두 모이면{' '}
        <span className={styles.titleGrad}>하나의 콜라주</span>
        로<br />완성돼요
      </>
    ),
    desc: '매일의 순간이 모여 우리만의 다이어리가 돼요. 지금 바로 시작해볼까요?',
  },
]

const TOTAL = SLIDES.length + 1 // 3 slides + login

export default function OnboardingPage() {
  const navigate       = useNavigate()
  const location       = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const redirectTo     = (location.state as { redirectTo?: string } | null)?.redirectTo ?? ROUTES.HOME
  const setAuth        = useAuthStore((s) => s.setAuth)
  const isDev          = import.meta.env.DEV

  const [idx, setIdx]               = useState(0)
  const [loading, setLoading]       = useState<number | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'kakao' | 'google' | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)

  const isLoginSlide = idx === SLIDES.length

  // OAuth callback 처리 — /login?kakao_code=... 등으로 돌아올 때
  useEffect(() => {
    const kakaoCode   = searchParams.get('kakao_code')
    const kakaoError  = searchParams.get('kakao_error')
    const googleCode  = searchParams.get('google_code')
    const googleError = searchParams.get('google_error')
    if (!kakaoCode && !kakaoError && !googleCode && !googleError) return
    setSearchParams({}, { replace: true })
    setIdx(SLIDES.length) // 로그인 슬라이드로 이동
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      localStorage.setItem('synk_onboarded', '1')
      navigate(redirectTo, { replace: true })
      userApi.getMe().then((r) => setAuth(r.data, token, refreshToken)).catch(() => {})
    } catch {
      setOauthError('카카오 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }

  function handleKakaoLogin() {
    if (oauthLoading) return
    const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY
    if (!kakaoKey) { setOauthError('카카오 앱 키가 설정되지 않았어요.'); return }
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
      localStorage.setItem('synk_onboarded', '1')
      navigate(redirectTo, { replace: true })
      userApi.getMe().then((r) => setAuth(r.data, token, refreshToken)).catch(() => {})
    } catch {
      setOauthError('Google 로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setOauthLoading(null)
    }
  }

  function handleGoogleLogin() {
    if (oauthLoading) return
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!googleClientId) { setOauthError('Google 클라이언트 ID가 설정되지 않았어요.'); return }
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
      localStorage.setItem('synk_onboarded', '1')
      navigate(redirectTo, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  function next() {
    if (idx < TOTAL - 1) setIdx(idx + 1)
  }

  return (
    <div className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      {/* 건너뛰기 — 로그인 슬라이드에선 숨김 */}
      {!isLoginSlide && (
        <button className={styles.skipBtn} onClick={() => setIdx(SLIDES.length)}>
          건너뛰기
        </button>
      )}

      <div className={styles.slides}>
        {!isLoginSlide ? (
          /* ── 온보딩 슬라이드 1-3 ─────────────────────────────────────── */
          <div className={styles.slide}>
            <div className={styles.illustWrap}>
              {idx === 0 && <Slide1Illust />}
              {idx === 1 && <Slide2Illust />}
              {idx === 2 && <Slide3Illust />}
            </div>
            <p className={styles.label}>{SLIDES[idx].label}</p>
            <h2 className={styles.title}>{SLIDES[idx].title(styles)}</h2>
            <p className={styles.desc}>{SLIDES[idx].desc}</p>
          </div>
        ) : (
          /* ── 로그인 슬라이드 (4번째) ─────────────────────────────────── */
          <div className={styles.loginSlide}>
            <div className={styles.loginLogoWrap}>
              <div className={styles.loginLogoGlow} />
              <img src="/icon-light.png" alt="SYNK" className={styles.loginLogoImg} />
            </div>
            <div className={styles.loginWordmark}>SYNK</div>
            <p className={styles.loginSlogan}>우리는 지금, <b>같은 순간</b>을 산다</p>

            <div className={styles.loginCta}>
              {oauthError && <p className={styles.loginError}>{oauthError}</p>}

              <button
                className={styles.loginBtnKakao}
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
                className={styles.loginBtnGoogle}
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

              <p className={styles.loginTerms}>
                가입 시 <a href="/profile/terms">이용약관</a> 및 <a href="/profile/privacy">개인정보처리방침</a>에<br/>동의하게 됩니다.
              </p>

              {isDev && (
                <div className={styles.loginDev}>
                  <div className={styles.loginDevDivider}>
                    <div className={styles.loginDevLine} /><span>DEV — 유저 선택</span><div className={styles.loginDevLine} />
                  </div>
                  {DEV_USERS.map((u) => (
                    <button key={u.id} className={styles.loginDevBtn} onClick={() => handleDevLogin(u.id)} disabled={loading !== null}>
                      <span className={styles.loginDevAvatar}>{u.name[0]}</span>
                      {loading === u.id ? '로그인 중...' : `${u.name}으로 로그인`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 도트 + 버튼 ─────────────────────────────────────────────── */}
      <div className={styles.bottom}>
        <div className={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
        {!isLoginSlide && (
          <button className={styles.nextBtn} onClick={next}>
            {idx < SLIDES.length - 1 ? '다음' : '시작하기'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Slide illustrations ─────────────────────────────────────────────────── */

function Slide1Illust() {
  const angles = [-30, 75, 160, 250]
  const R = 82

  return (
    <>
      <div className={styles.orbit} />
      <div className={styles.orbitCenter}>
        <span className={styles.orbitBoltIcon}>⚡</span>
      </div>
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x = Math.cos(rad) * R
        const y = Math.sin(rad) * R
        return (
          <div
            key={i}
            className={styles.orbitAvatar}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px - 19px)`,
              top: `calc(50% + ${y}px - 19px)`,
            }}
          >
            <PersonIcon />
          </div>
        )
      })}
    </>
  )
}

function Slide2Illust() {
  return (
    <div className={styles.missionCard}>
      <div className={styles.missionCardTag}>MISSION · 지금 바로</div>
      <div className={styles.missionCardTimer}>04:32</div>
      <div className={styles.missionCardTitle}>지금 내 표정 그대로 찍기</div>
      <div className={styles.missionCardEmoji}>🎬</div>
      <div className={styles.missionCardBar}>
        <div className={styles.missionCardBarFill} />
      </div>
    </div>
  )
}

function Slide3Illust() {
  const cells = [0, 1, 2, 3, 4, 5]
  const heartIdx = 4

  return (
    <div className={styles.collageGrid}>
      {cells.map((i) => (
        <div
          key={i}
          className={`${styles.collageCell} ${i === heartIdx ? styles.collageCellHeart : ''}`}
        >
          {i === heartIdx && '💜'}
        </div>
      ))}
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="rgba(244,247,255,0.7)" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="rgba(244,247,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}
