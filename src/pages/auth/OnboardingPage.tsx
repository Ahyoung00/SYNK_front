import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'

// [Phase 1 stub] — 온보딩 슬라이드 (PDF p.3)
// 구현: 예고 없이 울리는 미션 소개 슬라이드 + 건너뛰기 버튼
export default function OnboardingPage() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: 24, color: 'var(--color-text)', background: 'var(--color-bg)', minHeight: '100dvh' }}>
      <h1>SYNK 소개</h1>
      <p style={{ marginTop: 16, color: 'var(--color-text-sub)' }}>
        예고 없이 울리는 미션,<br />친구들과 5분 안에 사진을 찍어<br />지금 이 순간을 함께 남겨요
      </p>
      <button
        onClick={() => navigate(ROUTES.LOGIN)}
        style={{ marginTop: 48, padding: '14px 32px', background: 'var(--color-primary)', borderRadius: 12, color: '#fff', fontSize: 16 }}
      >
        시작하기
      </button>
    </div>
  )
}
