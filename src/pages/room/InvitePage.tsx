import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { roomApi } from '@/services/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import styles from './InvitePage.module.css'

export default function InvitePage() {
  const { code }   = useParams<{ code: string }>()
  const navigate   = useNavigate()
  const isLoggedIn = useAuthStore((s) => !!s.token)

  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (!isLoggedIn) {
    return <Navigate to={ROUTES.LOGIN} state={{ redirectTo: `/invite/${code}` }} replace />
  }

  async function handleJoin() {
    if (!code || joining) return
    setJoining(true)
    setError(null)
    try {
      const res = await roomApi.joinRoom(code)
      navigate(ROUTES.ROOM(res.data.roomId), { replace: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '방 참여에 실패했어요. 코드를 확인해주세요.')
      setJoining(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🔗</div>
        <h2 className={styles.title}>SYNK 초대</h2>
        <p className={styles.desc}>
          초대 코드 <strong className={styles.code}>{code}</strong>로<br />방에 참여할까요?
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.joinBtn}
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? '참여 중...' : '참여하기'}
        </button>
        <button className={styles.cancelBtn} onClick={() => navigate(ROUTES.ROOMS)}>
          취소
        </button>
      </div>
    </div>
  )
}
