import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoomChatMessage } from '@/types'

interface ChatState {
  /** messages per room, keyed by roomId (as string) */
  messages: Record<string, RoomChatMessage[]>
  /** chatId whose reaction picker is open; null = closed */
  reactionTarget: number | null
  /**
   * 클라이언트 사이드 리액션 추적
   * key: `${roomId}:${messageId}` → 내가 추가한 emoji 목록
   */
  myReactions: Record<string, string[]>

  /** 특정 방 메시지를 교체 (초기 로드 시 사용 — prepend와 달리 기존 데이터 덮어씀) */
  setMessages:    (roomId: number, msgs: RoomChatMessage[]) => void
  prependMessages: (roomId: number, msgs: RoomChatMessage[]) => void
  appendMessage:   (roomId: number, msg: RoomChatMessage)    => void
  /** emoji 기준으로 count 증가 (없으면 신규 추가) */
  addReaction:    (roomId: number, msgId: number, emoji: string) => void
  /** emoji 기준으로 count 감소 (0이 되면 제거) */
  removeReaction: (roomId: number, msgId: number, emoji: string) => void
  setReactionTarget: (chatId: number | null) => void
  /** 유저 전환 시 모든 캐시 초기화 */
  clearAll: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
  messages:      {},
  reactionTarget: null,
  myReactions:   {},

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

  addReaction: (roomId, msgId, emoji) =>
    set((s) => {
      const key  = String(roomId)
      const rKey = `${roomId}:${msgId}`
      const msgs = (s.messages[key] ?? []).map((m) => {
        if (m.messageId !== msgId) return m
        const existing = m.reactions ?? []
        const idx = existing.findIndex((r) => r.emoji === emoji)
        const reactions =
          idx >= 0
            ? existing.map((r, i) => i === idx ? { ...r, count: r.count + 1 } : r)
            : [...existing, { emoji, count: 1 }]
        return { ...m, reactions }
      })
      const myReactions = {
        ...s.myReactions,
        [rKey]: [...(s.myReactions[rKey] ?? []), emoji],
      }
      return { messages: { ...s.messages, [key]: msgs }, myReactions }
    }),

  removeReaction: (roomId, msgId, emoji) =>
    set((s) => {
      const key  = String(roomId)
      const rKey = `${roomId}:${msgId}`
      const msgs = (s.messages[key] ?? []).map((m) => {
        if (m.messageId !== msgId) return m
        const reactions = (m.reactions ?? [])
          .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1 } : r)
          .filter((r) => r.count > 0)
        return { ...m, reactions }
      })
      const myReactions = {
        ...s.myReactions,
        [rKey]: (s.myReactions[rKey] ?? []).filter((e) => e !== emoji),
      }
      return { messages: { ...s.messages, [key]: msgs }, myReactions }
    }),

  setReactionTarget: (chatId) => set({ reactionTarget: chatId }),

  clearAll: () => set({ messages: {}, myReactions: {}, reactionTarget: null }),
    }),
    {
      name: 'synk_chat_reactions',
      // messages는 서버에서 로드하므로 myReactions만 저장
      partialize: (s) => ({ myReactions: s.myReactions }),
    },
  )
)
