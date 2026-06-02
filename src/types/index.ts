// ─────────────────────────────────────────────────────────────────────────────
// SYNK — TypeScript type definitions
// Mirrors the Spring Boot DB schema (see docs/spec.md § Database)
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthProvider = 'KAKAO' | 'GOOGLE'

export interface User {
  id: number
  auth_provider: AuthProvider
  auth_provider_id: string
  name: string
  profile_image?: string
  fcm_token?: string
  status: string
  deleted_at?: string
  mission_alert: boolean
  result_alert: boolean
  highlight_alert: boolean
  created_at: string
  updated_at: string
}

// ── Room ──────────────────────────────────────────────────────────────────────

export interface Room {
  id: number
  name: string
  code: string
  thumbnail?: string
  owner_id: number
  max_members: number
  current_members: number
  daily_mission_count: number
  /** "HH:mm:ss" */
  mission_start_time: string
  /** "HH:mm:ss" */
  mission_end_time: string
  created_at: string
}

export interface RoomMember {
  id: number
  user_id: number
  room_id: number
  is_owner: boolean
  joined_at: string
  /** Joined from user table for UI */
  user?: Pick<User, 'id' | 'name' | 'profile_image'>
}

// ── Mission ───────────────────────────────────────────────────────────────────

export interface MissionTemplate {
  id: number
  title: string
  description?: string
}

export type MissionType = 'VIDEO'
export type MissionStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED'

export interface Mission {
  id: number
  room_id: number
  mission_template_id: number
  type: MissionType
  status: MissionStatus
  targeted_at: string
  deadline: string
  created_at: string
  /** Joined for UI */
  template?: MissionTemplate
}

// ── Submission ────────────────────────────────────────────────────────────────

export type SubmissionStatus = 'SUBMITTED' | 'MISSED'

export interface Submission {
  id: number
  user_id: number
  room_id: number
  mission_id: number
  video_url?: string
  status: SubmissionStatus
  submitted_at?: string
}

/** Per-member participation view used in the collage / waiting screen */
export interface MemberParticipation {
  user: Pick<User, 'id' | 'name' | 'profile_image'>
  submission?: Submission
  /** 'done' | 'recording' | 'waiting' */
  state: 'done' | 'recording' | 'waiting'
}

// ── Collage ───────────────────────────────────────────────────────────────────

export interface Collage {
  id: number
  mission_id: number
  room_id: number
  collage_video_url: string
  thumbnail?: string
  /** 0–100 */
  participation_rate: number
  /** seconds from mission start to last submission */
  completion_time: number
  total_members: number
  submitted_count: number
  created_at: string
}

// ── SynkLog ───────────────────────────────────────────────────────────────────

export type SynkLogStatus = 'PROCESSING' | 'COMPLETED'

export interface SynkLog {
  id: number
  room_id: number
  /** "YYYY-MM-DD" */
  date: string
  synklog_video_url?: string
  thumbnail?: string
  status: SynkLogStatus
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'IMAGE' | 'EMOJI'

export interface ChatReaction {
  id: number
  chat_id: number
  user_id: number
  emoji: string
  created_at: string
}

export interface RoomChat {
  id: number
  room_id: number
  user_id: number
  message_type: MessageType
  content: string
  created_at: string
  reactions?: ChatReaction[]
  /** Joined for UI */
  user?: Pick<User, 'id' | 'name' | 'profile_image'>
}

// ── Collection (도감) ─────────────────────────────────────────────────────────

export interface CollectionRecord {
  id: number
  user_id: number
  mission_template_id: number
  room_id: number
  submission_id: number
  /** "YYYY-MM-DD" */
  date: string
  thumbnail?: string
  created_at: string
}

/** Enriched template used on the 도감 list page */
export interface CollectionEntry {
  template: MissionTemplate
  records: CollectionRecord[]
  completion_count: number
  last_completed_at?: string
  /** true if user has completed at least once */
  unlocked: boolean
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'MISSION_START'
  | 'MISSION_COMPLETE'
  | 'SYNKLOG_CREATED'
  | 'MEMBER_JOIN'
  | 'ACHIEVEMENT'

export interface AppNotification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  content: string
  related_id?: number
  is_read: boolean
  created_at: string
}

// ── API wrappers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  size: number
  has_next: boolean
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export type WsEventType =
  | 'MISSION_FIRED'
  | 'MEMBER_SUBMITTED'
  | 'MISSION_COMPLETED'
  | 'CHAT_MESSAGE'
  | 'CHAT_REACTION'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'

export interface WsEvent<T = unknown> {
  type: WsEventType
  room_id: number
  payload: T
}

// ── UI-only helpers ───────────────────────────────────────────────────────────

/** Active mission state tracked in the mission store */
export interface ActiveMissionState {
  mission: Mission
  room: Room
  /** seconds remaining (counts down from 300) */
  seconds_left: number
  participations: MemberParticipation[]
  my_submission?: Submission
}
