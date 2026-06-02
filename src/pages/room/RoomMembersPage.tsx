import { useState } from 'react'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomMembersPage.module.css'

// 개발용 — 방장 여부 (실제 구현 시 서버 데이터로 대체)
const IS_OWNER = true

const INITIAL_MEMBERS = [
  { id: 1, name: '유현', handle: '@id1', isOwner: true  },
  { id: 2, name: '지민', handle: '@id2', isOwner: false },
  { id: 3, name: '아영', handle: '@id3', isOwner: false },
  { id: 4, name: '수현', handle: '@id4', isOwner: false },
  { id: 5, name: '대주', handle: '@id5', isOwner: false },
]

export default function RoomMembersPage() {
  const [members, setMembers] = useState(INITIAL_MEMBERS)

  function handleKick(id: number, name: string) {
    if (!window.confirm(`${name}님을 강퇴하시겠어요?`)) return
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader title="멤버 관리" />

      {/* ── 멤버 목록 ────────────────────────────────────────────────────────── */}
      <div className={styles.memberList}>
        {members.map((m) => (
          <div key={m.id} className={styles.memberRow}>
            <div className={styles.memberInfo}>
              <span className={styles.memberName}>{m.name}</span>
              <span className={styles.memberHandle}>{m.handle}</span>
            </div>
            {m.isOwner && <span className={styles.ownerBadge}>방장</span>}
            {IS_OWNER && !m.isOwner && (
              <button
                className={styles.kickBtn}
                onClick={() => handleKick(m.id, m.name)}
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
