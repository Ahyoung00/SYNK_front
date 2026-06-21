import { useEffect, useState } from 'react'
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
  const highlightAlert  = useSettingsStore((s) => s.highlightAlert)
  const setMissionAlert   = useSettingsStore((s) => s.setMissionAlert)
  const setResultAlert    = useSettingsStore((s) => s.setResultAlert)
  const setHighlightAlert = useSettingsStore((s) => s.setHighlightAlert)

  const [completionRate, setCompletionRate] = useState<number | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)

  useEffect(() => {
    collectionApi.getMyCollection().then((res) => {
      setCompletionRate(res.data.completionRate)
      setCompletedCount(res.data.completedCount)
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
            <span className={styles.profileMeta}>SYNK</span>
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
          <div className={styles.statCard}>
            <span className={styles.statValue}>-</span>
            <span className={styles.statLabel}>연속</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {completedCount != null ? completedCount : '-'}
            </span>
            <span className={styles.statLabel}>내 컷</span>
          </div>
        </div>

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
            <div className={styles.divider} />
            <ToggleRow
              label="하이라이트 알림"
              desc="새 영상이 만들어지면 알려줘요"
              value={highlightAlert}
              onChange={(v) => { setHighlightAlert(v); updateNotification({ highlightNotification: v }) }}
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

        {/* ── 로그아웃 ─────────────────────────────────────────────────────────── */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
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
