import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/services/api/endpoints'
import NavHeader from '@/components/layout/NavHeader'
import styles from './ProfileEditPage.module.css'

export default function ProfileEditPage() {
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const setUser   = useAuthStore((s) => s.setUser)
  const [name, setName]       = useState(user?.name ?? '')
  const [saving, setSaving]   = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await userApi.updateProfile({ name: name.trim() })
      if (user) setUser({ ...user, name: name.trim() })
      navigate(-1)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="프로필 수정"
        right={<button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>}
      />

      <div className={styles.scroll}>
        {/* ── 아바타 ──────────────────────────────────────────────────────────── */}
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            <span className={styles.avatarEmoji}>😊</span>
          </div>
          <button className={styles.changePhotoBtn}>프로필 사진 변경</button>
        </div>

        {/* ── 이름 필드 ────────────────────────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>이름</label>
          <input
            className={styles.fieldInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
          />
        </div>

      </div>
    </div>
  )
}
