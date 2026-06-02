import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './WithdrawPage.module.css'

const CONFIRM_PHRASE = 'SYNK 탈퇴'

const DELETE_ITEMS = [
  '내가 찍은 모든 사진과 SYNKLOG',
  '도감 수집 기록 및 댓글·리액션',
  '참여 중인 모든 방에서 자동 퇴장',
]

export default function WithdrawPage() {
  const navigate = useNavigate()
  const logout   = useAuthStore((s) => s.logout)
  const [input, setInput] = useState('')

  const confirmed = input === CONFIRM_PHRASE

  function handleWithdraw() {
    if (!confirmed) return
    // TODO: API 호출
    logout()
    navigate(ROUTES.ONBOARDING, { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="회원 탈퇴" />

      <div className={styles.scroll}>
        {/* ── 경고 카드 ────────────────────────────────────────────────────────── */}
        <div className={styles.warnCard}>
          <span className={styles.warnIcon}>⚠️</span>
          <p className={styles.warnTitle}>탈퇴 전에 꼭 확인하세요</p>
          <p className={styles.warnDesc}>
            탈퇴 후 데이터는 14일간 보관 후 영구 삭제되며, 복구가 불가능해요.
          </p>
        </div>

        {/* ── 삭제 항목 ────────────────────────────────────────────────────────── */}
        <div className={styles.deleteSection}>
          <p className={styles.deleteSectionTitle}>삭제되는 데이터</p>
          <div className={styles.deleteList}>
            {DELETE_ITEMS.map((item) => (
              <div key={item} className={styles.deleteItem}>
                <span className={styles.deleteCheck}>✓</span>
                <span className={styles.deleteText}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 확인 입력 ────────────────────────────────────────────────────────── */}
        <div className={styles.confirmSection}>
          <p className={styles.confirmLabel}>아래 문구를 입력하고 탈퇴를 확정하세요</p>
          <input
            className={styles.confirmInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`'${CONFIRM_PHRASE}' 입력`}
          />
        </div>

        {/* ── 버튼 ────────────────────────────────────────────────────────────── */}
        <div className={styles.btnGroup}>
          <button
            className={[styles.withdrawBtn, confirmed ? styles.withdrawBtnActive : ''].filter(Boolean).join(' ')}
            onClick={handleWithdraw}
            disabled={!confirmed}
          >
            탈퇴하기
          </button>
          <button className={styles.cancelBtn} onClick={() => navigate(-1)}>
            취소하고 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

