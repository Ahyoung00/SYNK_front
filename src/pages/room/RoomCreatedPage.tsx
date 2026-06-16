import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import styles from './RoomCreatedPage.module.css'

export default function RoomCreatedPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const id         = Number(roomId)

  const [roomName, setRoomName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [copied, setCopied]     = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)

  useEffect(() => {
    if (!id) return
    roomApi.getRoom(id)
      .then((res) => {
        setRoomName(res.data.name)
        setRoomCode(res.data.code)
      })
      .catch(console.error)
  }, [id])

  function handleCopyCode() {
    navigator.clipboard?.writeText(roomCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inviteLink = `https://synk-front.vercel.app/room/${id}?code=${roomCode}`
  const shareText  = `SYNK 방에 초대합니다! 코드: ${roomCode}\n${inviteLink}`

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

  return (
    <div className={styles.page}>
      {/* ── 배경 그라디언트 ──────────────────────────────────────────────────── */}
      <div className={styles.heroBg} />

      {/* ── 콘텐츠 ──────────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {/* 이모지 썸네일 */}
        <div className={styles.thumb}>
          <span className={styles.thumbEmoji}>🌅</span>
        </div>

        {/* 완료 메시지 */}
        <div className={styles.textBlock}>
          <p className={styles.subTitle}>⚡ {roomName} 생성 완료!</p>
          <p className={styles.desc}>친구에게 아래 코드를 공유해 초대해보세요</p>
        </div>

        {/* 초대 코드 카드 */}
        <div className={styles.codeCard}>
          <span className={styles.codeLabel}>초대 코드</span>
          <span className={styles.codeValue}># {roomCode}</span>
          <button className={styles.copyBtn} onClick={handleCopyCode}>
            {copied ? '✓ 복사됨' : '코드 복사'}
          </button>
        </div>

        {/* 친구 초대 링크 */}
        <button className={styles.inviteLink} onClick={() => setInviteSheet(true)}>
          친구 초대하기 →
        </button>
      </div>

      {/* ── 하단 버튼 ────────────────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <button
          className={styles.startBtn}
          onClick={() => navigate(ROUTES.ROOM(id), { replace: true })}
        >
          방으로 이동
        </button>
      </div>

      {/* ── 친구 초대 바텀시트 ───────────────────────────────────────────────── */}
      {inviteSheet && (
        <div className={styles.overlay} onClick={() => setInviteSheet(false)}>
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
                  <span
                    className={styles.shareIcon}
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.emoji}
                  </span>
                  <span className={styles.shareLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <button className={styles.sheetCancel} onClick={() => setInviteSheet(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  )
}
