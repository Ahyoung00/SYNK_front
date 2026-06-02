// ─────────────────────────────────────────────────────────────────────────────
// SYNK — App-wide constants
// ─────────────────────────────────────────────────────────────────────────────

/** Mission time limit in seconds (5 minutes) */
export const MISSION_DURATION_S = 300

/** Short video recording limits */
export const VIDEO_MIN_S = 3
export const VIDEO_MAX_S = 5

/** Maximum room members */
export const ROOM_MAX_MEMBERS = 10

/** Total number of mission templates in 도감 */
export const COLLECTION_TOTAL = 90

/** Capacitor plugin IDs */
export const CAMERA_PLUGIN = '@capacitor/camera'

// ── API ───────────────────────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? '/ws'

// ── Route paths ───────────────────────────────────────────────────────────────

export const ROUTES = {
  ONBOARDING: '/onboarding',
  LOGIN: '/login',

  HOME: '/',

  // Mission flow
  MISSION_DETAIL: (roomId: number | string) => `/mission/${roomId}`,
  MISSION_CAMERA: (roomId: number | string) => `/mission/${roomId}/camera`,
  MISSION_WAITING: (roomId: number | string) => `/mission/${roomId}/waiting`,
  MISSION_PROCESSING: (roomId: number | string) => `/mission/${roomId}/processing`,
  MISSION_RESULT: (missionId: number | string) => `/result/${missionId}`,

  // Room
  ROOM: (roomId: number | string) => `/room/${roomId}`,
  ROOM_ALBUM: (roomId: number | string) => `/room/${roomId}/album`,
  ROOM_SYNKLOG: (roomId: number | string, synklogId: number | string) =>
    `/room/${roomId}/album/${synklogId}`,
  ROOM_CHAT: (roomId: number | string) => `/room/${roomId}/chat`,
  ROOM_SETTINGS: (roomId: number | string) => `/room/${roomId}/settings`,
  ROOM_MEMBERS: (roomId: number | string) => `/room/${roomId}/settings/members`,
  ROOM_CREATE: '/room/create',
  ROOM_CREATED: (roomId: number | string) => `/room/${roomId}/created`,
  ROOM_JOIN: '/room/join',
  INVITE: (code: string) => `/invite/${code}`,

  // Bottom tabs
  COLLECTION: '/collection',
  COLLECTION_DETAIL: (missionId: number | string) => `/collection/${missionId}`,
  ROOMS: '/rooms',

  // Notification (top icon → full-screen)
  NOTIFICATIONS: '/notifications',

  // Profile
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  WITHDRAW: '/profile/withdraw',
} as const

// ── Storage keys ──────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'synk_auth_token',
  REFRESH_TOKEN: 'synk_refresh_token',
  USER: 'synk_user',
  ONBOARDING_DONE: 'synk_onboarding_done',
} as const

// ── Timer colors (based on remaining seconds) ─────────────────────────────────

export const TIMER_COLORS = {
  /** > 3 min remaining: safe */
  SAFE: '#4ade80',    // green
  /** 1–3 min: caution */
  WARN: '#facc15',    // yellow
  /** < 1 min: danger */
  DANGER: '#ef4444',  // red
} as const

export function getTimerColor(secondsLeft: number): string {
  if (secondsLeft > 180) return TIMER_COLORS.SAFE
  if (secondsLeft > 60) return TIMER_COLORS.WARN
  return TIMER_COLORS.DANGER
}
