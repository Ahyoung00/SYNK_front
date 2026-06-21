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

  const [members, setMembers]   = useState<RoomMemberItem[]>([])
  const [roomName, setRoomName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([roomApi.getMembers(id), roomApi.getRoom(id)])
      .then(([membersRes, roomRes]) => {
        setMembers(membersRes.data)
        setRoomName(roomRes.data.name)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id])

  const myMember = members.find((m) => m.userId === me?.userId)
  const isOwner  = myMember?.isOwner ?? false
  const owner    = members.find((m) => m.isOwner)
  const nonOwners = members.filter((m) => !m.isOwner)

  function handleKick(userId: number, name: string) {
    if (!window.confirm(`${name}님을 내보내시겠어요?`)) return
    roomApi
      .kickMember(id, userId)
      .then(() => setMembers((prev) => prev.filter((m) => m.userId !== userId)))
      .catch(console.error)
  }

  return (
    <div className={styles.page}>
      <NavHeader title="멤버 관리" />

      <div className={styles.scroll}>
        {isLoading ? (
          <p style={{ padding: '40px 20px', textAlign: 'center', color: '#9AA0BD' }}>불러오는 중...</p>
        ) : (
          <>
            {/* ── 서브헤더 ──────────────────────────────────────────────────── */}
            <p className={styles.subHeader}>{roomName} · 멤버 {members.length}명</p>

            {/* ── 방장 ─────────────────────────────────────────────────────── */}
            {owner && (
              <>
                <span className={styles.sectionLabel}>방장</span>
                <div className={styles.card}>
                  <MemberCard
                    member={owner}
                    isMe={owner.userId === me?.userId}
                    isOwner={true}
                    showKick={false}
                    onKick={handleKick}
                  />
                </div>
              </>
            )}

            {/* ── 멤버 ─────────────────────────────────────────────────────── */}
            {nonOwners.length > 0 && (
              <>
                <span className={styles.sectionLabel}>멤버 · {nonOwners.length}</span>
                <div className={styles.card}>
                  {nonOwners.map((m, i) => (
                    <div key={m.userId}>
                      {i > 0 && <div className={styles.cardDivider} />}
                      <MemberCard
                        member={m}
                        isMe={m.userId === me?.userId}
                        isOwner={false}
                        showKick={isOwner}
                        onKick={handleKick}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

          </>
        )}
      </div>
    </div>
  )
}

/* ── MemberCard ──────────────────────────────────────────────────────────────── */

function MemberCard({
  member, isMe, isOwner, showKick, onKick,
}: {
  member: RoomMemberItem
  isMe: boolean
  isOwner: boolean
  showKick: boolean
  onKick: (id: number, name: string) => void
}) {
  const initial = member.name?.charAt(0) ?? '?'

  return (
    <div className={styles.memberRow}>
      {/* 아바타 */}
      <div className={[styles.avatar, isOwner ? styles.avatarOwner : ''].join(' ')}>
        {member.profileImage
          ? <img src={member.profileImage} alt={member.name} className={styles.avatarImg} />
          : <span className={styles.avatarInitial}>{initial}</span>
        }
      </div>

      {/* 정보 */}
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>
          {member.name}
          {isMe && <span className={styles.meLabel}> (나)</span>}
        </span>
      </div>

      {/* 우측 배지 / 버튼 */}
      {isOwner && (
        <div className={styles.ownerBadge}>👑 방장</div>
      )}
      {showKick && (
        <button
          className={styles.kickBtn}
          onClick={() => onKick(member.userId, member.name)}
        >
          강퇴
        </button>
      )}
    </div>
  )
}

/* ── 아이콘 ───────────────────────────────────────────────────────────────── */

