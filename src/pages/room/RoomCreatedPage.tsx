import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './RoomCreatedPage.module.css'

const ROOM_CODE = '7X8K2'
const ROOM_NAME = '새벽반'

export default function RoomCreatedPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)

  function handleCopyCode() {
    navigator.clipboard?.writeText(ROOM_CODE).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <p className={styles.subTitle}>⚡ {ROOM_NAME} 생성 완료!</p>
          <p className={styles.desc}>친구에게 아래 코드를 공유해 초대해보세요</p>
        </div>

        {/* 초대 코드 카드 */}
        <div className={styles.codeCard}>
          <span className={styles.codeLabel}>초대 코드</span>
          <span className={styles.codeValue}># {ROOM_CODE}</span>
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
          onClick={() => navigate(ROUTES.ROOM(1), { replace: true })}
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
              <span className={styles.sheetCode}># {ROOM_CODE}</span>
              <button className={styles.sheetCopyBtn} onClick={handleCopyCode}>
                {copied ? '✓' : '복사'}
              </button>
            </div>

            {/* 공유 링크 */}
            <div className={styles.sheetLinkRow}>
              <span className={styles.sheetLink}>synk.app/join/{ROOM_CODE}</span>
              <button className={styles.sheetLinkCopy} onClick={handleCopyCode}>복사</button>
            </div>

            {/* 공유 아이콘 */}
            <div className={styles.shareRow}>
              {[
                { emoji: '💬', label: '카카오톡', bg: '#FEE500', color: '#391B1B' },
                { emoji: '📸', label: '인스타',   bg: '#E1306C', color: '#fff' },
                { emoji: '✉️', label: '메시지',   bg: '#34C759', color: '#fff' },
                { emoji: '•••', label: '더보기',  bg: 'var(--color-surface-2)', color: 'var(--color-text)' },
              ].map((s) => (
                <div key={s.label} className={styles.shareItem}>
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
