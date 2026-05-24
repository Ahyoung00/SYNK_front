import type { MemberParticipation } from '@/types'
import styles from './ParticipationRow.module.css'

interface Props {
  participations: MemberParticipation[]
  myUserId?: number
  /** 'row' = 가로 스크롤, 'grid' = 2열 그리드 (대기 화면용) */
  layout?: 'row' | 'grid'
}

export function ParticipationRow({ participations, myUserId, layout = 'row' }: Props) {
  const doneCount = participations.filter((p) => p.state === 'done').length

  return (
    <div className={styles.container}>
      <p className={styles.header}>
        참여 현황{' '}
        <span className={styles.count}>
          {doneCount}/{participations.length}
        </span>
      </p>

      <div className={layout === 'grid' ? styles.grid : styles.row}>
        {participations.map((p) => (
          <MemberChip key={p.user.id} p={p} isMe={p.user.id === myUserId} />
        ))}
      </div>
    </div>
  )
}

function MemberChip({ p, isMe }: { p: MemberParticipation; isMe: boolean }) {
  const initial = p.user.name.charAt(0)

  return (
    <div className={styles.chip}>
      <div className={[styles.avatar, styles[p.state], isMe ? styles.me : ''].join(' ')}>
        {p.user.profile_image ? (
          <img src={p.user.profile_image} alt={p.user.name} className={styles.avatarImg} />
        ) : (
          <span className={styles.initial}>{initial}</span>
        )}

        {/* 상태 뱃지 */}
        {p.state === 'done' && (
          <span className={styles.badge} aria-label="완료">✓</span>
        )}
        {p.state === 'recording' && (
          <span className={[styles.badge, styles.badgeRecording].join(' ')} aria-label="촬영 중">●</span>
        )}
      </div>

      <span className={styles.name} title={p.user.name}>
        {isMe ? `${p.user.name}(나)` : p.user.name}
      </span>
      <span className={styles.stateLabel}>
        {p.state === 'done' ? '완료' : p.state === 'recording' ? '찍는 중' : '대기'}
      </span>
    </div>
  )
}
