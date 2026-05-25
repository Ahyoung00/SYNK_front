import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi } from '@/services/api/endpoints'
import NavHeader from '@/components/layout/NavHeader'
import styles from './JoinRoomPage.module.css'

export default function JoinRoomPage() {
  const navigate = useNavigate()
  const [code, setCode]           = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // 코드는 최대 6자리, 4자 이상이어야 버튼 활성화
  const canJoin = code.trim().length >= 4 && !isLoading

  async function handleJoin() {
    if (!canJoin) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await roomApi.joinRoom(code.trim().toUpperCase())
      const roomId = res.data?.roomId
      if (!roomId) throw new Error('방 정보를 받지 못했어요')
      navigate(ROUTES.ROOM(roomId), { replace: true })
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : '참가에 실패했어요'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="방 참가하기" />

      {/* ── 본문 ────────────────────────────────────────────────────────────── */}
      <div className={styles.body}>
        <p className={styles.desc}>친구에게 받은 초대 코드를 입력해주세요</p>

        {/* 코드 입력 */}
        <div className={[styles.inputRow, error ? styles.inputRowError : ''].filter(Boolean).join(' ')}>
          <span className={styles.inputPrefix}>#</span>
          <input
            className={styles.codeInput}
            placeholder="초대 코드 입력"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            maxLength={6}
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
          />
        </div>

        {error
          ? <p className={styles.errorMsg}>{error}</p>
          : <p className={styles.hint}>코드는 영문 대문자 + 숫자 조합이에요</p>
        }

        {/* 참가하기 버튼 — 입력창 아래 독립 배치 */}
        <button
          className={[styles.joinBtn, canJoin ? styles.joinBtnActive : ''].join(' ')}
          onClick={handleJoin}
          disabled={!canJoin}
        >
          {isLoading ? '참가 중...' : '참가하기'}
        </button>
      </div>
    </div>
  )
}
