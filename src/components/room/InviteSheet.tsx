import { useState } from 'react'
import styles from './InviteSheet.module.css'

interface InviteSheetProps {
  roomId: number
  roomCode: string
  open: boolean
  onClose: () => void
}

/** 친구 초대 바텀시트 — 코드/링크 복사 + 공유 */
export default function InviteSheet({ roomId: _roomId, roomCode, open, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false)

  const baseUrl    = import.meta.env.VITE_APP_URL ?? 'https://synk-front.vercel.app'
  const inviteLink = `${baseUrl}/invite/${roomCode}`
  const shareText  = `SYNK 방에 초대합니다! 코드: ${roomCode}\n${inviteLink}`

  function handleCopyCode() {
    navigator.clipboard?.writeText(roomCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleKakao() {
    const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY
    if (!kakaoKey) return
    const w = window as unknown as { Kakao?: { isInitialized: () => boolean; init: (k: string) => void; Share: { sendDefault: (o: object) => void } } }
    if (!w.Kakao) return
    if (!w.Kakao.isInitialized()) w.Kakao.init(kakaoKey)
    w.Kakao.Share.sendDefault({
      objectType: 'text',
      text: shareText,
      link: { mobileWebUrl: inviteLink, webUrl: inviteLink },
    })
  }

  function handleSMS() {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`)
  }

  function handleInsta() {
    navigator.clipboard?.writeText(shareText).catch(() => {})
    window.open('https://www.instagram.com/', '_blank')
  }

  function handleMore() {
    if (navigator.share) {
      navigator.share({ title: 'SYNK 초대', text: shareText, url: inviteLink }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(inviteLink).catch(() => {})
      alert('링크가 복사됐어요!')
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <p className={styles.sheetTitle}>친구 초대</p>

        {/* 코드 + 복사 */}
        <div className={styles.sheetCodeRow}>
          <span className={styles.sheetCode}># {roomCode}</span>
          <button className={styles.sheetCopyBtn} onClick={handleCopyCode}>
            {copied ? '✓' : '복사'}
          </button>
        </div>

        {/* 공유 링크 */}
        <div className={styles.sheetLinkRow}>
          <span className={styles.sheetLink}>synk.app/join/{roomCode}</span>
          <button className={styles.sheetLinkCopy} onClick={handleCopyCode}>복사</button>
        </div>

        {/* 공유 아이콘 */}
        <div className={styles.shareRow}>
          {[
            { emoji: '💬', label: '카카오톡', bg: '#FEE500', color: '#391B1B', onClick: handleKakao },
            { emoji: '📸', label: '인스타',   bg: '#E1306C', color: '#fff',    onClick: handleInsta },
            { emoji: '✉️', label: '메시지',   bg: '#34C759', color: '#fff',    onClick: handleSMS },
            { emoji: '•••', label: '더보기',  bg: 'var(--color-surface-2)', color: 'var(--color-text)', onClick: handleMore },
          ].map((s) => (
            <div key={s.label} className={styles.shareItem} onClick={s.onClick} style={{ cursor: 'pointer' }}>
              <span className={styles.shareIcon} style={{ background: s.bg, color: s.color }}>
                {s.emoji}
              </span>
              <span className={styles.shareLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <button className={styles.sheetCancel} onClick={onClose}>취소</button>
      </div>
    </div>
  )
}
