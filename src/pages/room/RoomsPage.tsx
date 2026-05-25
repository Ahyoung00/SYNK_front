import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi } from '@/services/api/endpoints'
import type { Room } from '@/types'
import AppHeader from '@/components/layout/AppHeader'
import styles from './RoomsPage.module.css'

// 서버에서 내려오는 enriched Room (mock 서버 /rooms 전용 필드 포함)
interface RoomWithUI extends Room {
  ui_status: 'active' | 'done' | 'waiting'
  ui_status_text: string
  members_detail: Array<{ userId: number; name: string; profileImage: string | null }>
  member_count: number
}

export default function RoomsPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomWithUI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sheet, setSheet] = useState(false)

  useEffect(() => {
    roomApi
      .getMyRooms()
      .then((res) => setRooms(res.data as RoomWithUI[]))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const activeRooms  = rooms.filter((r) => r.ui_status !== 'waiting')
  const waitingRooms = rooms.filter((r) => r.ui_status === 'waiting')

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <AppHeader subtitle="방 목록" />

      {/* ── 스크롤 ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>

        {isLoading && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⏳</span>
            <p className={styles.emptyTitle}>불러오는 중...</p>
          </div>
        )}

        {/* 참여중 */}
        {!isLoading && activeRooms.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>참여중</span>
            <div className={styles.roomList}>
              {activeRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onClick={() => navigate(ROUTES.ROOM(room.id))}
                />
              ))}
            </div>
          </div>
        )}

        {/* 대기중 */}
        {!isLoading && waitingRooms.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>
              대기중{' '}
              <span className={styles.sectionDesc}>인원이 다 차면 참여중인 방으로 이동</span>
            </span>
            <div className={styles.roomList}>
              {waitingRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onClick={() => navigate(ROUTES.ROOM(room.id))}
                />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && rooms.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🚪</span>
            <p className={styles.emptyTitle}>아직 참여한 방이 없어요</p>
            <p className={styles.emptyDesc}>
              친구들과 새 방을 만들거나
              <br />
              초대 코드로 들어가보세요
            </p>
          </div>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button className={styles.fab} onClick={() => setSheet(true)} aria-label="방 추가">
        <span className={styles.fabIcon}>+</span>
      </button>

      {/* ── 방 추가 바텀시트 — #root 기준으로 Portal 렌더링 ──────────────────── */}
      {sheet && createPortal(
        <div className={styles.overlay} onClick={() => setSheet(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <p className={styles.sheetTitle}>방 추가하기</p>
            <div className={styles.sheetBtns}>
              <button
                className={styles.sheetBtn}
                onClick={() => { setSheet(false); navigate(ROUTES.ROOM_CREATE) }}
              >
                <span className={styles.sheetBtnIcon}>✏️</span>
                <div className={styles.sheetBtnText}>
                  <span className={styles.sheetBtnLabel}>새 방 만들기</span>
                  <span className={styles.sheetBtnDesc}>나만의 방을 만들어 친구를 초대해요</span>
                </div>
                <span className={styles.sheetBtnArrow}>›</span>
              </button>
              <div className={styles.sheetDivider} />
              <button
                className={styles.sheetBtn}
                onClick={() => { setSheet(false); navigate(ROUTES.ROOM_JOIN) }}
              >
                <span className={styles.sheetBtnIcon}>🔑</span>
                <div className={styles.sheetBtnText}>
                  <span className={styles.sheetBtnLabel}>초대 코드로 참가</span>
                  <span className={styles.sheetBtnDesc}>코드를 입력해 친구 방에 참여해요</span>
                </div>
                <span className={styles.sheetBtnArrow}>›</span>
              </button>
            </div>
            <button className={styles.sheetCancel} onClick={() => setSheet(false)}>취소</button>
          </div>
        </div>,
        document.getElementById('root')!,
      )}
    </div>
  )
}

// ── RoomCard ──────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: RoomWithUI
  onClick: () => void
}

function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <button className={styles.roomCard} onClick={onClick}>
      <div className={styles.cardTop}>
        <span className={styles.roomName}>{room.name}</span>
        <span
          className={[
            styles.statusText,
            room.ui_status === 'done'    ? styles.statusDone :
            room.ui_status === 'waiting' ? styles.statusWaiting :
            styles.statusActive,
          ].join(' ')}
        >
          {room.ui_status_text}
        </span>
      </div>
      <div className={styles.avatarStack}>
        {room.members_detail.slice(0, 5).map((m, i) => (
          <span
            key={m.userId}
            className={styles.avatarBubble}
            style={{ zIndex: room.members_detail.length - i }}
            title={m.name}
          >
            {m.name.charAt(0)}
          </span>
        ))}
        {room.members_detail.length > 5 && (
          <span className={[styles.avatarBubble, styles.avatarMore].join(' ')}>
            +{room.members_detail.length - 5}
          </span>
        )}
      </div>
    </button>
  )
}
