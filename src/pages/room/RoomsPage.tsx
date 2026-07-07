import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ROUTES } from '@/constants'
import { roomApi } from '@/services/api/endpoints'
import type { ActiveRoom, WaitingRoom } from '@/types'
import AppHeader from '@/components/layout/AppHeader'
import Loading from '@/components/ui/Loading'
import styles from './RoomsPage.module.css'

const ORDER_KEY = 'synk_room_order'

function savedOrder(): number[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') } catch { return [] }
}
function saveOrder(ids: number[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
}
function applyOrder<T extends { id: number }>(rooms: T[], order: number[]): T[] {
  if (order.length === 0) return rooms
  const map = new Map(rooms.map((r) => [r.id, r]))
  const sorted = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []))
  const rest = rooms.filter((r) => !order.includes(r.id))
  return [...sorted, ...rest]
}

export default function RoomsPage() {
  const navigate = useNavigate()
  const [activeRooms, setActiveRooms]   = useState<ActiveRoom[]>([])
  const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sheet, setSheet] = useState(false)

  useEffect(() => {
    function refresh() {
      roomApi
        .getMyRooms()
        .then((res) => {
          const active  = res.data.active  ?? []
          const waiting = res.data.waiting ?? []
          setActiveRooms(applyOrder(active,  savedOrder()))
          setWaitingRooms(waiting)
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
    refresh()
    const id = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(id)
  }, [])

  const [editMode, setEditMode] = useState(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as number)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setActiveRooms((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      saveOrder(next.map((r) => r.id))
      return next
    })
  }

  const draggingRoom = draggingId != null ? activeRooms.find((r) => r.id === draggingId) ?? null : null

  const rooms = [...activeRooms, ...waitingRooms]

  return (
    <div className={styles.page}>
      <AppHeader subtitle="방 목록" />

      <div className={styles.scroll}>

        {isLoading && <Loading />}

        {/* 참여중 */}
        {!isLoading && activeRooms.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              참여 중
              <span className={styles.sectionCount}>{activeRooms.length}</span>
              <button className={styles.editBtn} onClick={() => setEditMode((v) => !v)}>
                {editMode ? '완료' : '편집'}
              </button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={activeRooms.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.roomList}>
                  {activeRooms.map((room) => (
                    <SortableActiveRoomCard
                      key={room.id}
                      room={room}
                      editMode={editMode}
                      onClick={() => { if (!editMode) navigate(ROUTES.ROOM(room.id)) }}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
                {draggingRoom && (
                  <ActiveRoomCard room={draggingRoom} onClick={() => {}} editMode overlayMode />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* 대기중 */}
        {!isLoading && waitingRooms.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              대기 중
              <span className={styles.sectionCount}>{waitingRooms.length}</span>
            </div>
            <div className={styles.roomList}>
              {waitingRooms.map((room) => (
                <WaitingRoomCard
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

        {/* 방 만들기 인라인 카드 */}
        {!isLoading && (
          <button className={styles.createCard} onClick={() => setSheet(true)}>
            <div className={styles.createIcon}>＋</div>
            <div className={styles.createText}>
              <span className={styles.createLabel}>새로운 방 만들기</span>
              <span className={styles.createDesc}>친구를 초대해 같은 순간을 담아요</span>
            </div>
          </button>
        )}
      </div>

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

// ── Sortable wrapper ──────────────────────────────────────────────────────────

function SortableActiveRoomCard({ room, onClick, editMode }: { room: ActiveRoom; onClick: () => void; editMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: room.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <ActiveRoomCard
        room={room}
        onClick={onClick}
        editMode={editMode}
        cardDragProps={editMode ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}

// ── RoomCard ──────────────────────────────────────────────────────────────────

function RoomThumbnail({ src }: { src: string | null }) {
  return (
    <div className={styles.thumbnail}>
      <img src={src ?? '/SYNK.jpeg'} alt="" className={styles.thumbnailImg} />
    </div>
  )
}

function ActiveRoomCard({
  room, onClick, editMode, overlayMode, cardDragProps,
}: {
  room: ActiveRoom
  onClick: () => void
  editMode?: boolean
  overlayMode?: boolean
  cardDragProps?: React.HTMLAttributes<HTMLElement>
}) {
  const allDone    = room.isAllCompleted
  const hasNewChat = room.hasUnreadChat

  return (
    <div
      className={[styles.roomCard, overlayMode ? styles.roomCardOverlay : ''].filter(Boolean).join(' ')}
      style={{ cursor: editMode ? 'default' : 'pointer' }}
    >
      {editMode && (
        <div
          className={styles.dragHandle}
          style={{ cursor: 'grab', touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
          {...cardDragProps}
        >
          <DragIcon />
        </div>
      )}
      <button className={styles.cardClickArea} onClick={onClick} disabled={editMode}>
        <div className={styles.cardInner}>
          <RoomThumbnail src={room.roomThumbnail} />
          <div className={styles.cardBody}>
            <div className={styles.cardTop}>
              <div className={styles.roomNameRow}>
                <span className={styles.roomName}>{room.name}</span>
                <span className={styles.memberCount}>멤버 {room.memberProfiles.length}명</span>
                {hasNewChat && (
                  <div className={styles.chatBanner}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        fill="currentColor" opacity="0.9" />
                    </svg>
                    새 채팅
                  </div>
                )}
              </div>
              <span className={allDone ? styles.missionBadgeDone : styles.missionBadge}>
                오늘 미션 {room.completedMissions}/{room.totalMissions}{allDone ? ' ✓' : ''}
              </span>
            </div>
            <div className={styles.cardBottom}>
              <div className={styles.avatarStack}>
                {room.memberProfiles.slice(0, 5).map((m, i) => (
                  <div key={m.userId} className={styles.avatarBubble} style={{ zIndex: room.memberProfiles.length - i }}>
                    {m.profileImage
                      ? <img src={m.profileImage} alt="" className={styles.avatarBubbleImg} />
                      : <span className={styles.avatarBubbleInitial}>{m.name ? m.name.charAt(0) : <PersonIcon />}</span>
                    }
                  </div>
                ))}
                {room.memberProfiles.length > 5 && (
                  <div className={[styles.avatarBubble, styles.avatarMore].join(' ')}>
                    +{room.memberProfiles.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
          <span className={styles.enterArrow}>›</span>
        </div>
      </button>
    </div>
  )
}

function WaitingRoomCard({ room, onClick }: { room: WaitingRoom; onClick: () => void }) {
  return (
    <div className={styles.roomCard}>
      <button className={styles.cardClickArea} onClick={onClick}>
        <div className={styles.cardInner}>
          <RoomThumbnail src={room.roomThumbnail} />
          <div className={styles.cardBody}>
            <div className={styles.cardTop}>
              <div className={styles.roomNameRow}>
                <span className={styles.roomName}>{room.name}</span>
                <span className={styles.memberCount}>멤버 {room.currentMembers}명</span>
              </div>
              <span className={styles.missionBadge}>
                {room.waitingCount}명 더 기다리는 중
              </span>
            </div>
            <div className={styles.cardBottom}>
              <div className={styles.avatarStack}>
                {room.memberProfiles.slice(0, 5).map((m, i) => (
                  <div key={m.userId} className={styles.avatarBubble} style={{ zIndex: room.memberProfiles.length - i }}>
                    {m.profileImage
                      ? <img src={m.profileImage} alt="" className={styles.avatarBubbleImg} />
                      : <span className={styles.avatarBubbleInitial}>{m.name ? m.name.charAt(0) : <PersonIcon />}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className={styles.enterArrow}>›</span>
        </div>
      </button>
    </div>
  )
}

function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9"  cy="6"  r="1.5" fill="currentColor" />
      <circle cx="15" cy="6"  r="1.5" fill="currentColor" />
      <circle cx="9"  cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9"  cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.5" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  )
}
