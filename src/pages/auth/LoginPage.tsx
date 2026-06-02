import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { api } from '@/services/api/client'
import { userApi } from '@/services/api/endpoints'
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
  const [loading, setLoading] = useState<number | null>(null)

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
      background: 'var(--color-bg)', color: 'var(--color-text)', gap: 16, padding: '0 24px',
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px' }}>SYNK</h1>
      <p style={{ color: 'var(--color-text-sub)', marginBottom: 32 }}>지금 이 순간을 함께</p>

      {/* 실제 OAuth 버튼 — 백엔드 연동 후 활성화 */}
      <button
        disabled
        style={{
          width: '100%', maxWidth: 320, padding: '14px 24px',
          background: '#FEE500', color: '#191919', borderRadius: 12,
          fontWeight: 700, fontSize: 15, opacity: 0.4, cursor: 'not-allowed',
        }}
      >
        카카오 로그인
      </button>
      <button
        disabled
        style={{
          width: '100%', maxWidth: 320, padding: '14px 24px',
          background: '#fff', color: '#191919', borderRadius: 12,
          fontWeight: 700, fontSize: 15, opacity: 0.4, cursor: 'not-allowed',
        }}
      >
        Google 계정으로 로그인
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
