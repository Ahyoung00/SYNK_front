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

  const [name, setName]           = useState(user?.name ?? '')
  const [photoUrl, setPhotoUrl]   = useState<string | null>(user?.profileImage ?? null)
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [saving, setSaving]       = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handlePhotoClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setNewPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setPhotoUrl(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const payload: { name?: string; profileImage?: string } = { name: name.trim() }
      // 새 파일을 선택한 경우에만 profileImage 포함 (카카오 CDN URL은 절대 전송 안 함)
      if (newPhotoFile && photoUrl?.startsWith('data:')) {
        payload.profileImage = photoUrl
      }
      await userApi.updateProfile(payload)
      if (user) setUser({ ...user, name: name.trim(), profileImage: newPhotoFile ? photoUrl : user.profileImage })
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
