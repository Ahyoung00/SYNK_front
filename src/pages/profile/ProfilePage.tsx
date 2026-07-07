import { useEffect, useState } from 'react'
import { getToken } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type Theme } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { userApi, collectionApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import AppHeader from '@/components/layout/AppHeader'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const logout    = useAuthStore((s) => s.logout)
  const theme     = useThemeStore((s) => s.theme)
  const setTheme  = useThemeStore((s) => s.setTheme)

  const missionAlert    = useSettingsStore((s) => s.missionAlert)
  const resultAlert     = useSettingsStore((s) => s.resultAlert)
  const setMissionAlert   = useSettingsStore((s) => s.setMissionAlert)
  const setResultAlert    = useSettingsStore((s) => s.setResultAlert)

  const [completionRate, setCompletionRate] = useState<number | null>(null)
  const [joinDays, setJoinDays] = useState<number | null>(null)

  useEffect(() => {
    collectionApi.getMyCollection().then((res) => {
      setCompletionRate(res.data.completionRate)
    }).catch(() => {})

    userApi.getMe().then((res) => {
      setJoinDays(res.data.daysSinceJoined ?? daysSinceJoin(res.data.created_at))
    }).catch(() => {})
  }, [])

  async function updateNotification(patch: { missionNotification?: boolean; resultNotification?: boolean; highlightNotification?: boolean }) {
    try { await userApi.updateNotificationSettings(patch) } catch {}
  }

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const initial = user?.name ? user.name[0].toUpperCase() : '?'

  return (
    <div className={styles.page}>
      <AppHeader subtitle="마이페이지" />

      <div className={styles.scroll}>
        {/* ── 프로필 카드 ─────────────────────────────────────────────────────── */}
        <div className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt="프로필" className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitial}>{initial}</span>
            )}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{user?.name ?? '내 프로필'}</span>
            <span className={styles.profileMeta}>
              {joinDays != null ? `SYNK ${joinDays}일째` : 'SYNK'}
            </span>
          </div>
          <button className={styles.editBtn} onClick={() => navigate(ROUTES.PROFILE_EDIT)}>
            수정
          </button>
        </div>

        {/* ── 스탯 행 ─────────────────────────────────────────────────────────── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {completionRate != null ? `${Math.round(completionRate)}%` : '-'}
            </span>
            <span className={styles.statLabel}>수집률</span>
          </div>
        </div>

        {/* ── 연결된 계정 ─────────────────────────────────────────────────────── */}
        <ConnectedAccountSection user={user} />

        {/* ── 알림 설정 ───────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>알림 설정</h2>
          <div className={styles.sectionCard}>
            <ToggleRow
              label="미션 알림"
              desc="미션 시작 전 알림을 받아요"
              value={missionAlert}
              onChange={(v) => { setMissionAlert(v); updateNotification({ missionNotification: v }) }}
            />
            <div className={styles.divider} />
            <ToggleRow
              label="결과 알림"
              desc="결과가 생성되면 알려줘요"
              value={resultAlert}
              onChange={(v) => { setResultAlert(v); updateNotification({ resultNotification: v }) }}
            />
          </div>
        </div>

        {/* ── 기타 ────────────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>기타</h2>
          <div className={styles.sectionCard}>
            <ThemeRow theme={theme} onChange={setTheme} />
            <div className={styles.divider} />
            <LinkRow label="도움말" onPress={() => navigate(ROUTES.HELP)} showArrow />
            <div className={styles.divider} />
            <LinkRow label="버전 정보" value="v0.1.0" onPress={() => navigate(ROUTES.VERSION)} showArrow />
            <div className={styles.divider} />
            <LinkRow label="회원 탈퇴" onPress={() => navigate(ROUTES.WITHDRAW)} showArrow danger />
          </div>
        </div>

        {/* ── FCM 디버그 ──────────────────────────────────────────────────────── */}
        <FcmDebugButton />

        {/* ── 로그아웃 ─────────────────────────────────────────────────────────── */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

/** 가입일로부터 며칠째인지 (가입 당일 = 1일째) */
function daysSinceJoin(createdAt?: string | null): number | null {
  if (!createdAt) return null
  const start = new Date(createdAt)
  if (isNaN(start.getTime())) return null
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const now = new Date()
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((nowDay.getTime() - startDay.getTime()) / 86400000)
  return diff >= 0 ? diff + 1 : null
}

/* ── FCM 디버그 버튼 ────────────────────────────────────────────────────────── */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

function FcmDebugButton() {
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCheck() {
    setLoading(true)
    setInfo(null)
    try {
      const permission = Notification.permission
      let token = '(권한 없음)'
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready
        token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
      }
      setInfo(`권한: ${permission}\n\nFCM 토큰:\n${token}`)
    } catch (err) {
      setInfo(`오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '0 20px 8px' }}>
      <button
        onClick={handleCheck}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          background: 'var(--card-bg, rgba(255,255,255,0.7))',
          border: '1px solid var(--card-border, rgba(0,0,0,0.08))',
          color: 'var(--ink, #1C1640)',
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '확인 중...' : '🔔 FCM 알림 상태 확인'}
      </button>
      {info && (
        <pre
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            background: 'var(--card-bg, rgba(255,255,255,0.7))',
            border: '1px solid var(--card-border, rgba(0,0,0,0.08))',
            fontSize: 11,
            color: 'var(--ink, #1C1640)',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {info}
        </pre>
      )}
    </div>
  )
}

/* ── 연결된 계정 섹션 ────────────────────────────────────────────────────────── */

function detectProvider(profileImage: string | null): 'kakao' | 'google' {
  if (profileImage?.includes('kakaocdn')) return 'kakao'
  if (profileImage?.includes('googleusercontent')) return 'google'
  return 'kakao'
}

function ConnectedAccountSection({ user }: { user: { name: string; profileImage: string | null } | null }) {
  if (!user) return null
  const provider = detectProvider(user.profileImage)

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionLabel}>연결된 계정</h2>
      <div className={styles.sectionCard}>
        <div className={styles.accountRow}>
          {/* 아이콘 */}
          {provider === 'kakao' ? (
            <div className={styles.accountIcon} style={{ background: '#FEE500' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#181600">
                <path d="M12 3C6.477 3 2 6.477 2 10.909c0 2.803 1.696 5.267 4.27 6.77l-1.09 3.98a.25.25 0 00.376.274L10.1 19.2A11.3 11.3 0 0012 19.32c5.523 0 10-3.477 10-7.91S17.523 3 12 3z"/>
              </svg>
            </div>
          ) : (
            <div className={styles.accountIcon} style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
          )}

          {/* 텍스트 */}
          <div className={styles.accountInfo}>
            <span className={styles.accountName}>{provider === 'kakao' ? '카카오' : '구글'}</span>
            <span className={styles.accountSub}>{user.name}</span>
          </div>

          {/* 배지 */}
          <span className={styles.connectedBadge}>연결됨</span>
        </div>
      </div>
    </div>
  )
}

/* ── 서브 컴포넌트 ──────────────────────────────────────────────────────────── */

function ThemeRow({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className={styles.themeRow}>
      <span className={styles.rowLabel}>화면 테마</span>
      <div className={styles.themeToggleGroup}>
        <button
          className={[styles.themeBtn, theme === 'light' ? styles.themeBtnActive : ''].join(' ')}
          onClick={() => onChange('light')}
        >
          라이트
        </button>
        <button
          className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
          onClick={() => onChange('dark')}
        >
          다크
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label, desc, value, onChange,
}: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleText}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowDesc}>{desc}</span>
      </div>
      <button
        className={[styles.toggle, value ? styles.toggleOn : ''].filter(Boolean).join(' ')}
        onClick={() => onChange(!value)}
        aria-checked={value}
        role="switch"
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

function LinkRow({
  label, value, onPress, showArrow = false, danger = false,
}: { label: string; value?: string; onPress: () => void; showArrow?: boolean; danger?: boolean }) {
  return (
    <button
      className={[styles.linkRow, danger ? styles.linkRowDanger : ''].filter(Boolean).join(' ')}
      onClick={onPress}
    >
      <span className={styles.rowLabel}>{label}</span>
      {value != null ? (
        <span className={styles.linkValue}>{value}</span>
      ) : showArrow ? (
        <span className={styles.linkArrow}>›</span>
      ) : null}
    </button>
  )
}
