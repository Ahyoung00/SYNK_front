import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import InviteSheet from '@/components/room/InviteSheet'
import styles from './RoomCreatedPage.module.css'

export default function RoomCreatedPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const location   = useLocation()
  const id         = Number(roomId)

  const [roomName, setRoomName]       = useState('')
  const [roomCode, setRoomCode]       = useState('')
  const [thumbnail, setThumbnail]     = useState<string | null>(
    (location.state as { thumbnail?: string } | null)?.thumbnail ?? null
  )
  const [copied, setCopied]           = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)

  useEffect(() => {
    if (!id) return
    roomApi.getRoom(id)
      .then((res) => {
        setRoomName(res.data.name)
        setRoomCode(res.data.code)
        if (res.data.thumbnail) setThumbnail(res.data.thumbnail)
      })
      .catch(console.error)
  }, [id])

  function handleCopyCode() {
    navigator.clipboard?.writeText(roomCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.page}>
      {/* ── 배경 그라디언트 ──────────────────────────────────────────────────── */}
      <div className={styles.heroBg} />

      {/* ── 콘텐츠 ──────────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {/* 방 썸네일 */}
        <div className={styles.thumb}>
          <img
            src={thumbnail ?? '/SYNK.jpeg'}
            alt={roomName}
            className={styles.thumbImg}
          />
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
      <InviteSheet
        roomId={id}
        roomCode={roomCode}
        open={inviteSheet}
        onClose={() => setInviteSheet(false)}
      />
    </div>
  )
}
