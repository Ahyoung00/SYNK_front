import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { roomApi } from '@/services/api/endpoints'
import type { RoomMember } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomMembersPage.module.css'

export default function RoomMembersPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const id = Number(roomId)
  const me = useAuthStore((s) => s.user)

  const [members, setMembers] = useState<RoomMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    roomApi
      .getMembers(id)
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id])

  // 내가 방장인지 확인
  const myMember = members.find((m) => m.user_id === me?.userId)
  const isOwner  = myMember?.is_owner ?? false

  function handleKick(memberId: number, name: string) {
    if (!window.confirm(`${name}님을 강퇴하시겠어요?`)) return
    roomApi
      .kickMember(id, memberId)
      .then(() => setMembers((prev) => prev.filter((m) => m.user_id !== memberId)))
      .catch(console.error)
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="멤버 관리" />

      {/* ── 멤버 목록 ─────────────────────────────────────────────────────────── */}
      <div className={styles.memberList}>
        {isLoading && (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>불러오는 중...</p>
        )}
        {members.map((m) => {
          const name = m.user?.name ?? '알 수 없음'
          return (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.memberInfo}>
                <div className={styles.memberAvatar}>
                  {m.user?.profileImage
                    ? <img src={m.user.profileImage} alt={name} className={styles.memberAvatarImg} />
                    : <span className={styles.memberAvatarInitial}>👤</span>
                  }
                </div>
                <span className={styles.memberName}>{name}</span>
              </div>
              {m.is_owner && <span className={styles.ownerBadge}>방장</span>}
              {isOwner && !m.is_owner && (
                <button
                  className={styles.kickBtn}
                  onClick={() => handleKick(m.user_id, name)}
                >
                  강퇴
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
