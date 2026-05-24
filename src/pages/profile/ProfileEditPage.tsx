import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import NavHeader from '@/components/layout/NavHeader'
import styles from './ProfileEditPage.module.css'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '유현')

  function handleSave() {
    // TODO: API 호출 후 authStore 업데이트
    navigate(-1)
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="프로필 수정"
        right={<button className={styles.saveBtn} onClick={handleSave}>저장</button>}
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

        {/* ── 아이디 필드 (읽기 전용) ────────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>아이디</label>
          <div className={styles.fieldReadonly}>
            <span className={styles.fieldPrefix}>@</span>
            <span className={styles.fieldValue}>iam.synk</span>
          </div>
        </div>
      </div>
    </div>
  )
}
