import { create } from 'zustand'
import type { RoomChat, ChatReaction } from '@/types'

interface ChatState {
  /** messages per room, keyed by roomId (as string) */
  messages: Record<string, RoomChat[]>
  /** chatId whose reaction picker is open; null = closed */
  reactionTarget: number | null

  prependMessages: (roomId: number, msgs: RoomChat[]) => void
  appendMessage: (roomId: number, msg: RoomChat) => void
  addReaction: (roomId: number, chatId: number, reaction: ChatReaction) => void
  removeReaction: (roomId: number, chatId: number, reactionId: number) => void
  setReactionTarget: (chatId: number | null) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: {},
  reactionTarget: null,

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

  addReaction: (roomId, chatId, reaction) =>
    set((s) => {
      const key = String(roomId)
      const msgs = (s.messages[key] ?? []).map((m) => {
        if (m.id !== chatId) return m
        return { ...m, reactions: [...(m.reactions ?? []), reaction] }
      })
      return { messages: { ...s.messages, [key]: msgs } }
    }),

  removeReaction: (roomId, chatId, reactionId) =>
    set((s) => {
      const key = String(roomId)
      const msgs = (s.messages[key] ?? []).map((m) => {
        if (m.id !== chatId) return m
        return { ...m, reactions: (m.reactions ?? []).filter((r) => r.id !== reactionId) }
      })
      return { messages: { ...s.messages, [key]: msgs } }
    }),

  setReactionTarget: (chatId) => set({ reactionTarget: chatId }),
}))
