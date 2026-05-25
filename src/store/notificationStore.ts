import { create } from 'zustand'
import type { AppNotification } from '@/types'

interface NotificationStore {
  notifications: AppNotification[]
  unreadCount: number

  setNotifications: (list: AppNotification[]) => void
  prependNotification: (n: AppNotification) => void
  markRead: (id: number) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (list) =>
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.isRead).length,
    }),

  prependNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + (n.isRead ? 0 : 1),
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}))
