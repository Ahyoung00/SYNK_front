import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/services/api/endpoints'
import NavHeader from '@/components/layout/NavHeader'
import styles from './ProfileEditPage.module.css'

export default function ProfileEditPage() {
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const setUser   = useAuthStore((s) => s.setUser)

  const [name, setName]         = useState(user?.name ?? '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.profileImage ?? null)
  const [saving, setSaving]     = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handlePhotoClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setPhotoUrl(result)
    }
    reader.readAsDataURL(file)
    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = ''
  }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const payload: { name?: string; profileImage?: string } = { name: name.trim() }
      // 사진이 변경된 경우에만 포함
      if (photoUrl !== (user?.profileImage ?? null)) {
        payload.profileImage = photoUrl ?? undefined
      }
      await userApi.updateProfile(payload)
      if (user) setUser({ ...user, name: name.trim(), profileImage: photoUrl })
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
        right={
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        }
      />

      <div className={styles.scroll}>
        {/* ── 아바타 ──────────────────────────────────────────────────────────── */}
        <div className={styles.avatarSection}>
          <div className={styles.avatar} onClick={handlePhotoClick} style={{ cursor: 'pointer' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="프로필" className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarEmoji}>😊</span>
            )}
          </div>
          <button className={styles.changePhotoBtn} onClick={handlePhotoClick}>
            프로필 사진 변경
          </button>
          {/* 숨겨진 파일 인풋 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
