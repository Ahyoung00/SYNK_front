import { useEffect } from 'react'
import { wsClient } from '@/services/websocket/client'
import { useMissionStore } from '@/store/missionStore'
import type { WsEvent, Submission, RoomChatMessage } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// useWebSocket — connect to a room's WS channel and react to events
// ─────────────────────────────────────────────────────────────────────────────

export function useRoomWebSocket(roomId: number | undefined) {
  const updateParticipation = useMissionStore((s) => s.updateParticipation)
  const setLastCollage = useMissionStore((s) => s.setLastCollage)

  useEffect(() => {
    if (!roomId) return

    wsClient.connect(roomId)

    const offSubmit = wsClient.on<Submission>('MEMBER_SUBMITTED', (e: WsEvent<Submission>) => {
      // Update the member's participation badge in the waiting screen
      updateParticipation({
        user: { userId: e.payload.user_id, name: '', profileImage: null },
        submission: e.payload,
        state: 'done',
      })
    })

    const offComplete = wsClient.on('MISSION_COMPLETED', (_e) => {
      // The collage is ready — store will pick it up via polling or REST
    })

    return () => {
      offSubmit()
      offComplete()
      wsClient.disconnect()
    }
  }, [roomId, updateParticipation, setLastCollage])
}

/** Send a chat message over WebSocket */
export function useChatSocket(roomId: number | undefined) {
  useEffect(() => {
    if (!roomId) return
    wsClient.connect(roomId)
    return () => wsClient.disconnect()
  }, [roomId])

  return {
    sendMessage: (content: string) =>
      wsClient.send({ type: 'CHAT_MESSAGE', room_id: roomId, payload: { content } }),

    sendReaction: (chatId: number, emoji: string) =>
      wsClient.send({ type: 'CHAT_REACTION', room_id: roomId, payload: { chat_id: chatId, emoji } }),

    onMessage: (handler: (e: WsEvent<RoomChatMessage>) => void) =>
      wsClient.on<RoomChatMessage>('CHAT_MESSAGE', handler),
  }
}
