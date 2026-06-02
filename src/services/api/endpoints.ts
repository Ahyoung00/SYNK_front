import { api } from './client'
import type {
  User,
  Room,
  RoomMember,
  Mission,
  Submission,
  Collage,
  SynkLog,
  RoomChat,
  CollectionEntry,
  AppNotification,
  PaginatedResponse,
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  kakaoLogin: (code: string) =>
    api.post<{ user: User; token: string; refresh_token: string }>('/auth/kakao', { code }),

  googleLogin: (idToken: string) =>
    api.post<{ user: User; token: string; refresh_token: string }>('/auth/google', { id_token: idToken }),

  refreshToken: (refresh_token: string) =>
    api.post<{ token: string }>('/auth/refresh', { refresh_token }),

  getMe: () => api.get<User>('/auth/me'),

  updateProfile: (data: { name?: string; profile_image?: string }) =>
    api.patch<User>('/auth/me', data),

  updateNotificationSettings: (data: {
    mission_alert?: boolean
    result_alert?: boolean
    highlight_alert?: boolean
  }) => api.patch<User>('/auth/me/notifications', data),

  withdraw: () => api.delete<void>('/auth/me'),
}

// ── Room ──────────────────────────────────────────────────────────────────────

export const roomApi = {
  getMyRooms: () => api.get<Room[]>('/rooms'),

  getRoom: (roomId: number) => api.get<Room>(`/rooms/${roomId}`),

  createRoom: (data: {
    name: string
    max_members: number
    daily_mission_count: number
    mission_start_time: string
    mission_end_time: string
  }) => api.post<Room>('/rooms', data),

  joinRoom: (code: string) => api.post<Room>('/rooms/join', { code }),

  leaveRoom: (roomId: number) => api.delete<void>(`/rooms/${roomId}/members/me`),

  deleteRoom: (roomId: number) => api.delete<void>(`/rooms/${roomId}`),

  updateRoom: (roomId: number, data: Partial<Room>) =>
    api.patch<Room>(`/rooms/${roomId}`, data),

  getMembers: (roomId: number) => api.get<RoomMember[]>(`/rooms/${roomId}/members`),

  kickMember: (roomId: number, userId: number) =>
    api.delete<void>(`/rooms/${roomId}/members/${userId}`),
}

// ── Mission ───────────────────────────────────────────────────────────────────

export const missionApi = {
  getActiveMission: (roomId: number) =>
    api.get<Mission>(`/rooms/${roomId}/missions/active`),

  submitVideo: (missionId: number, videoBlob: Blob) =>
    api.upload<Submission>(`/missions/${missionId}/submit`, videoBlob, 'video'),

  getMissionParticipations: (missionId: number) =>
    api.get<Submission[]>(`/missions/${missionId}/submissions`),

  getCollage: (missionId: number) =>
    api.get<Collage>(`/missions/${missionId}/collage`),
}

// ── SynkLog / Album ───────────────────────────────────────────────────────────

export const albumApi = {
  getSynklogs: (roomId: number) =>
    api.get<SynkLog[]>(`/rooms/${roomId}/synklogs`),

  getSynklog: (synklogId: number) =>
    api.get<SynkLog>(`/synklogs/${synklogId}`),
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatApi = {
  getMessages: (roomId: number, page = 0, size = 50) =>
    api.get<PaginatedResponse<RoomChat>>(
      `/rooms/${roomId}/chats?page=${page}&size=${size}`,
    ),

  addReaction: (chatId: number, emoji: string) =>
    api.post<void>(`/chats/${chatId}/reactions`, { emoji }),

  removeReaction: (chatId: number) =>
    api.delete<void>(`/chats/${chatId}/reactions/me`),
}

// ── Collection (도감) ─────────────────────────────────────────────────────────

export const collectionApi = {
  getMyCollection: () => api.get<CollectionEntry[]>('/collection'),

  getMissionDetail: (missionTemplateId: number) =>
    api.get<CollectionEntry>(`/collection/${missionTemplateId}`),
}

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationApi = {
  getNotifications: () => api.get<AppNotification[]>('/notifications'),

  markRead: (notificationId: number) =>
    api.patch<void>(`/notifications/${notificationId}/read`),

  markAllRead: () => api.patch<void>('/notifications/read-all'),
}
