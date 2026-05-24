import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'

// mock 유저 — 백엔드 연동 전 개발용
const DEV_MOCK_USER = {
  id: 1,
  auth_provider: 'KAKAO' as const,
  auth_provider_id: 'dev-001',
  name: '유현',
  profile_image: undefined,
  fcm_token: undefined,
  status: 'active',
  deleted_at: undefined,
  mission_alert: true,
  result_alert: true,
  highlight_alert: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const isDev = import.meta.env.DEV

  function handleDevLogin() {
    setAuth(DEV_MOCK_USER, 'dev-token', 'dev-refresh-token')
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh',
      background: '#0f0f14', color: '#fff', gap: 16, padding: '0 24px',
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px' }}>SYNK</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>지금 이 순간을 함께</p>

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

      {/* 개발용 바이패스 — DEV 모드에서만 노출 */}
      {isDev && (
        <div style={{ marginTop: 40, width: '100%', maxWidth: 320 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
              DEV ONLY
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <button
            onClick={handleDevLogin}
            style={{
              width: '100%', padding: '14px 24px',
              background: 'rgba(108, 99, 255, 0.15)',
              border: '1px dashed rgba(108, 99, 255, 0.5)',
              color: '#6c63ff', borderRadius: 12,
              fontWeight: 600, fontSize: 15,
            }}
          >
            🛠️ 개발용 바로 입장
          </button>
          <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            빌드 시 자동으로 사라짐
          </p>
        </div>
      )}
    </div>
  )
}
