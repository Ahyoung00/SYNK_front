import { useEffect } from 'react'
import { connectStomp } from '@/services/websocket/client'
import { useMissionStore } from '@/store/missionStore'
import type { Submission } from '@/types'

export function useRoomWebSocket(roomId: number | undefined) {
  const updateParticipation = useMissionStore((s) => s.updateParticipation)

  useEffect(() => {
    if (!roomId) return

    const disconnect = connectStomp(roomId, (incoming) => {
      const msg = incoming as { type?: string; payload?: Submission }
      if (msg.type === 'MEMBER_SUBMITTED' && msg.payload) {
        updateParticipation({
          user: { userId: msg.payload.user_id, name: '', profileImage: null },
          submission: msg.payload,
          state: 'done',
        })
      }
    })

    return disconnect
  }, [roomId, updateParticipation])
}

export function useChatSocket(_roomId: number | undefined) {
  return {}
}
