import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userApi, uploadApi } from '@/services/api/endpoints'
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
  const [provider, setProvider]   = useState<'kakao' | 'google' | null>(null)
  const [email, setEmail]         = useState<string | null>(null)

  useEffect(() => {
    userApi.getMe().then((res) => {
      setProvider(res.data.provider ?? null)
      setEmail(res.data.email ?? null)
    }).catch(() => {})
  }, [])

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

      if (newPhotoFile) {
        const { presignedUrl, fileUrl } = await uploadApi.getPresignedUrl(newPhotoFile.name, 'profile')
        const s3Res = await fetch(presignedUrl, { method: 'PUT', body: newPhotoFile })
        if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`)
        // 3) 짧은 fileUrl만 profileImage로 전달
        payload.profileImage = fileUrl
        setPhotoUrl(fileUrl)
      }

      await userApi.updateProfile(payload)
      if (user) setUser({ ...user, name: name.trim(), profileImage: payload.profileImage ?? user.profileImage })
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
          <div className={styles.fieldLabelRow}>
            <label className={styles.fieldLabel}>이름</label>
            <span className={styles.fieldCount}>{name.length}/16</span>
          </div>
          <input
            className={styles.fieldInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            maxLength={16}
          />
        </div>

        {/* ── 연결된 계정 ──────────────────────────────────────────────────────── */}
        {provider && (
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label className={styles.fieldLabel}>연결된 계정</label>
            </div>
            <div className={styles.accountRow}>
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
              <div className={styles.accountInfo}>
                <span className={styles.accountName}>
                  {provider === 'kakao' ? '카카오' : '구글'}
                </span>
                {email && <span className={styles.accountEmail}>{email}</span>}
              </div>
              <span className={styles.connectedBadge}>연결됨</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
