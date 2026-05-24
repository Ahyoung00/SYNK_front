import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants'
import AppHeader from '@/components/layout/AppHeader'
import styles from './RoomsPage.module.css'

const MOCK_ACTIVE_ROOMS = [
  {
    id: 1,
    name: '아침반',
    status: 'active' as const,
    statusText: '2/5 개 완료 · 조금 더 힘내요',
    members: ['😊', '😺', '🥷', '🐱', '🌸'],
  },
  {
    id: 2,
    name: 'zz반',
    status: 'done' as const,
    statusText: '오늘 미션 모두 완료🔥',
    members: ['😊', '😺', '🥷', '🐱', '🌸'],
  },
]

const MOCK_WAITING_ROOMS = [
  {
    id: 3,
    name: '축구부',
    status: 'waiting' as const,
    statusText: '2명 더 기다리는 중..',
    members: ['😊', '😺', '😱'],
  },
]

export default function RoomsPage() {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(false)

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <AppHeader subtitle="방 목록" />
      {/* ── 스크롤 ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll}>
        {/* 참여중 */}
        {MOCK_ACTIVE_ROOMS.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>참여중</span>
            <div className={styles.roomList}>
              {MOCK_ACTIVE_ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} onClick={() => navigate(ROUTES.ROOM(room.id))} />
              ))}
            </div>
          </div>
        )}

        {/* 대기중 */}
        {MOCK_WAITING_ROOMS.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>
              대기중{' '}
              <span className={styles.sectionDesc}>인원이 다 차면 참여중인 방으로 이동</span>
            </span>
            <div className={styles.roomList}>
              {MOCK_WAITING_ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} onClick={() => navigate(ROUTES.ROOM(room.id))} />
              ))}
            </div>
          </div>
        )}

        {MOCK_ACTIVE_ROOMS.length === 0 && MOCK_WAITING_ROOMS.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🚪</span>
            <p className={styles.emptyTitle}>아직 참여한 방이 없어요</p>
            <p className={styles.emptyDesc}>친구들과 새 방을 만들거나<br />초대 코드로 들어가보세요</p>
          </div>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button className={styles.fab} onClick={() => setSheet(true)} aria-label="방 추가">
        <span className={styles.fabIcon}>+</span>
      </button>

      {/* ── 방 추가 바텀시트 ─────────────────────────────────────────────────── */}
      {sheet && (
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
        </div>
      )}
    </div>
  )
}

type Room = { id: number; name: string; status: string; statusText: string; members: string[] }

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  return (
    <button className={styles.roomCard} onClick={onClick}>
      <div className={styles.cardTop}>
        <span className={styles.roomName}>{room.name}</span>
        <span
          className={[
            styles.statusText,
            room.status === 'done' ? styles.statusDone :
            room.status === 'waiting' ? styles.statusWaiting :
            styles.statusActive,
          ].join(' ')}
        >
          {room.statusText}
        </span>
      </div>
      <div className={styles.avatarStack}>
        {room.members.slice(0, 5).map((emoji, i) => (
          <span
            key={i}
            className={styles.avatarBubble}
            style={{ zIndex: room.members.length - i }}
          >
            {emoji}
          </span>
        ))}
        {room.members.length > 5 && (
          <span className={[styles.avatarBubble, styles.avatarMore].join(' ')}>
            +{room.members.length - 5}
          </span>
        )}
      </div>
    </button>
  )
}

