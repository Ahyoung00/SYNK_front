import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { authApi, userApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import type { User } from '@/types'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

interface Props {
  provider: 'kakao' | 'google'
}

export default function OAuthCallbackPage({ provider }: Props) {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth       = useAuthStore((s) => s.setAuth)
  const called        = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code  = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      navigate('/login', { replace: true })
      return
    }

    const origin      = window.location.origin
    const redirectUri = `${origin}/${provider}-callback.html`

    async function login() {
      try {
        const loginRes = provider === 'kakao'
          ? await authApi.kakaoLogin(code!, redirectUri)
          : await authApi.googleLogin(code!, redirectUri)

        const { token } = loginRes.data
        const user: User = {
          userId:                loginRes.data.userId,
          name:                  loginRes.data.name,
          profileImage:          toHttps(loginRes.data.profileImage),
          missionNotification:   true,
          resultNotification:    true,
          highlightNotification: true,
        }
        setAuth(user, token, '')
        useChatStore.getState().clearAll()
        navigate(ROUTES.HOME, { replace: true })
        userApi.getMe().then((r) => setAuth(r.data, token, '')).catch(() => {})
      } catch {
        navigate('/login', { replace: true })
      }
    }

    login()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--color-bg)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>로그인 중...</p>
    </div>
  )
}
