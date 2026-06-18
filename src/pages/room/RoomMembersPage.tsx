import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { roomApi } from '@/services/api/endpoints'
import type { RoomMemberItem } from '@/types'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomMembersPage.module.css'

export default function RoomMembersPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const id = Number(roomId)
  const me = useAuthStore((s) => s.user)

  const [members, setMembers] = useState<RoomMemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    roomApi
      .getMembers(id)
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id])

  const isOwner = members.find((m) => m.userId === me?.userId)?.isOwner ?? false

  function handleKick(userId: number, name: string) {
    if (!window.confirm(`${name}님을 강퇴하시겠어요?`)) return
    roomApi
      .kickMember(id, userId)
      .then(() => setMembers((prev) => prev.filter((m) => m.userId !== userId)))
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
        {members.map((m) => (
          <div key={m.userId} className={styles.memberRow}>
            <div className={styles.memberInfo}>
              <div className={styles.memberAvatar}>
                <img src={m.profileImage ?? '/SYNK.jpeg'} alt={m.name} className={styles.memberAvatarImg} />
              </div>
              <span className={styles.memberName}>{m.name}</span>
            </div>
            {m.isOwner && <span className={styles.ownerBadge}>방장</span>}
            {isOwner && !m.isOwner && (
              <button
                className={styles.kickBtn}
                onClick={() => handleKick(m.userId, m.name)}
              >
                강퇴
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
