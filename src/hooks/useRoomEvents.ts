import { useEffect, useRef } from 'react'
import { connectStomp } from '@/services/websocket/client'

/** /topic/rooms/{roomId} 로 들어오는 이벤트 (type 필드로 분기) */
export interface RoomEvent {
  type?: string
  userId?: number
  missionId?: number
  roomId?: number
  [key: string]: unknown
}

export interface RoomEventHandlers {
  /** 미션 발동 — 미션 시작 화면으로 이동 */
  onMissionFired?: (e: RoomEvent) => void
  /** 멤버 제출 — 대기 화면 참여 현황 갱신 */
  onMemberSubmitted?: (e: RoomEvent) => void
  /** 멤버 강퇴 — payload.userId가 본인이면 퇴장 처리 */
  onMemberKicked?: (e: RoomEvent) => void
  /** 그 외(채팅 등) 메시지 */
  onOther?: (e: RoomEvent) => void
}

/**
 * 방 WebSocket(/topic/rooms/{roomId})을 구독해 type 필드로 분기 처리.
 * handlers는 ref로 보관해 재구독(연결 재생성)을 막는다.
 */
export function useRoomEvents(
  roomId: number | undefined,
  handlers: RoomEventHandlers,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!roomId) return

    const disconnect = connectStomp(roomId, (raw) => {
      const e = raw as RoomEvent
      switch (e.type) {
        case 'MISSION_FIRED':
          handlersRef.current.onMissionFired?.(e)
          break
        case 'MEMBER_SUBMITTED':
          handlersRef.current.onMemberSubmitted?.(e)
          break
        case 'MEMBER_KICKED':
          handlersRef.current.onMemberKicked?.(e)
          break
        default:
          handlersRef.current.onOther?.(e)
      }
    })

    return disconnect
  }, [roomId])
}
