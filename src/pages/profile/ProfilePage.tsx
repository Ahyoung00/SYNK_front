import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type Theme } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { userApi } from '@/services/api/endpoints'
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

  async function updateNotification(patch: { missionNotification?: boolean; resultNotification?: boolean; highlightNotification?: boolean }) {
    try { await userApi.updateNotificationSettings(patch) } catch {}
  }

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <AppHeader subtitle="마이페이지" />

      <div className={styles.scroll}>
        {/* ── 프로필 카드 ─────────────────────────────────────────────────────── */}
        <div className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            <img src={user?.profileImage ?? '/SYNK.jpeg'} alt="프로필" className={styles.avatarImg} />
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{user?.name ?? '내 프로필'}</span>
          </div>
          <button
            className={styles.editBtn}
            onClick={() => navigate(ROUTES.PROFILE_EDIT)}
          >
            수정
          </button>
        </div>

        {/* ── 알림 설정 ───────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>알림 설정</h2>
          <div className={styles.sectionCard}>
            <ToggleRow
              label="미션 알림"
              desc="매고 없이 오는 알림을 받아요"
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
            <LinkRow label="도움말" onPress={() => {}} />
            <div className={styles.divider} />
            <LinkRow label="버전 정보" onPress={() => {}} />
            <div className={styles.divider} />
            <LinkRow label="회원 탈퇴" onPress={() => navigate(ROUTES.WITHDRAW)} />
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
          ☀️ 라이트
        </button>
        <button
          className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
          onClick={() => onChange('dark')}
        >
          🌙 다크
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

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button className={styles.linkRow} onClick={onPress}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.linkArrow}>›</span>
    </button>
  )
}

