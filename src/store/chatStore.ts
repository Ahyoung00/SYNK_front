import { create } from 'zustand'
import type { RoomChatMessage } from '@/types'

interface ChatState {
  /** messages per room, keyed by roomId (as string) */
  messages: Record<string, RoomChatMessage[]>

  /** 특정 방 메시지를 교체 (초기 로드 시 사용 — prepend와 달리 기존 데이터 덮어씀) */
  setMessages:    (roomId: number, msgs: RoomChatMessage[]) => void
  prependMessages: (roomId: number, msgs: RoomChatMessage[]) => void
  appendMessage:   (roomId: number, msg: RoomChatMessage)    => void
  /** 유저 전환 시 모든 캐시 초기화 */
  clearAll: () => void
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: {},

  setMessages: (roomId, msgs) =>
    set((s) => ({
      messages: { ...s.messages, [String(roomId)]: msgs },
    })),

  prependMessages: (roomId, msgs) =>
    set((s) => {
      const key = String(roomId)
      const existing = s.messages[key] ?? []
      return { messages: { ...s.messages, [key]: [...msgs, ...existing] } }
    }),

  appendMessage: (roomId, msg) =>
    set((s) => {
      const key = String(roomId)
      const existing = s.messages[key] ?? []
      return { messages: { ...s.messages, [key]: [...existing, msg] } }
    }),

  clearAll: () => set({ messages: {} }),
}))
