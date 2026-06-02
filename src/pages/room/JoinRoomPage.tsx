import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './JoinRoomPage.module.css'

export default function JoinRoomPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const canJoin = code.trim().length >= 4

  function handleJoin() {
    if (!canJoin) return
    // TODO: API call
    navigate(ROUTES.ROOM(1), { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="방 참가하기" />

      {/* ── 본문 ────────────────────────────────────────────────────────────── */}
      <div className={styles.body}>
        <p className={styles.desc}>친구에게 받은 초대 코드를 입력해주세요</p>

        {/* 코드 입력 */}
        <div className={styles.inputRow}>
          <span className={styles.inputPrefix}>#</span>
          <input
            className={styles.codeInput}
            placeholder="초대 코드"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button
            className={[styles.joinBtn, canJoin ? styles.joinBtnActive : ''].join(' ')}
            onClick={handleJoin}
            disabled={!canJoin}
          >
            참여
          </button>
        </div>

        <p className={styles.hint}>코드는 영문 대문자 + 숫자 조합이에요</p>
      </div>
    </div>
  )
}

