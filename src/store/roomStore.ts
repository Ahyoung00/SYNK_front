import { create } from 'zustand'
import type { Room, RoomMember } from '@/types'

interface RoomState {
  /** All rooms the current user belongs to */
  rooms: Room[]
  /** Currently focused room (room detail / chat) */
  currentRoom: Room | null
  /** Members of the currently focused room */
  currentMembers: RoomMember[]
  isLoading: boolean
  error: string | null

  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  removeRoom: (roomId: number) => void
  setCurrentRoom: (room: Room | null) => void
  setCurrentMembers: (members: RoomMember[]) => void
  updateRoom: (roomId: number, patch: Partial<Room>) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useRoomStore = create<RoomState>()((set) => ({
  rooms: [],
  currentRoom: null,
  currentMembers: [],
  isLoading: false,
  error: null,

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((s) => ({ rooms: [...s.rooms, room] })),

  removeRoom: (roomId) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) })),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  setCurrentMembers: (members) => set({ currentMembers: members }),

  updateRoom: (roomId, patch) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
      currentRoom:
        s.currentRoom?.id === roomId
          ? { ...s.currentRoom, ...patch }
          : s.currentRoom,
    })),

  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
}))
