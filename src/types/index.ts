// ─────────────────────────────────────────────────────────────────────────────
// SYNK — TypeScript type definitions
// Mirrors the Spring Boot DB schema (see docs/spec.md § Database)
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthProvider = 'KAKAO' | 'GOOGLE'

/**
 * GET /users/me 응답 (camelCase)
 * 스펙 확정 필드만 포함
 */
export interface User {
  userId: number
  name: string
  profileImage: string | null
  missionNotification: boolean
  resultNotification: boolean
  highlightNotification: boolean
}

// ── Room ──────────────────────────────────────────────────────────────────────

/**
 * 내부 스토어용 Room (snake_case, ActiveMissionState 등에서 사용)
 */
export interface Room {
  id: number
  name: string
  code: string
  thumbnail: string | null
  owner_id: number
  max_members: number
  current_members?: number | null  // ERD에 없음 — 스토어 호환용
  daily_mission_count: number
  /** "HH:mm:ss" */
  mission_start_time: string
  /** "HH:mm:ss" */
  mission_end_time: string
  created_at: string | null
}

/**
 * GET /rooms/{roomId} 응답 (camelCase, API 명세서 기준)
 */
export interface RoomDetail {
  id: number
  name: string
  code: string
  thumbnail: string | null
  ownerId: number
  currentMembers: number
  maxMembers: number
  dailyMissionCount: number
  missionStartTime: string
  missionEndTime: string
  members: Array<{ userId: number; name: string; profileImage: string | null }>
  recentAlbums: Array<{ date: string; thumbnail: string | null }>
}

/**
 * GET /rooms/my — 참여중 방 항목
 */
export interface ActiveRoom {
  id: number
  name: string
  totalMissions: number
  completedMissions: number
  isAllCompleted: boolean
  roomThumbnail: string | null
  memberProfiles: Array<{ userId: number; profileImage: string | null }>
}

/**
 * GET /rooms/my — 대기중 방 항목
 */
export interface WaitingRoom {
  id: number
  name: string
  currentMembers: number
  maxMembers: number
  waitingCount: number
  roomThumbnail: string | null
  memberProfiles: Array<{ userId: number; profileImage: string | null }>
}

/**
 * GET /rooms/my 응답 (API 명세서 기준)
 */
export interface RoomsMyResponse {
  active: ActiveRoom[]
  waiting: WaitingRoom[]
}

export interface RoomMember {
  id: number
  user_id: number
  room_id: number
  is_owner: boolean | null    // ERD: nullable
  joined_at: string | null    // ERD: nullable
  /** Joined from user table for UI (camelCase) */
  user?: Pick<User, 'userId' | 'name' | 'profileImage'>
}

/** GET /rooms/{roomId}/members 응답 내 개별 멤버 */
export interface RoomMemberItem {
  userId: number
  name: string
  profileImage: string | null
  isOwner: boolean
  joinedAt: string | null
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

// ── GET /missions/active 응답 ─────────────────────────────────────────────────

/** GET /missions/active — participants 배열 내 참여자 */
export interface ActiveMissionParticipant {
  userId: number
  name: string
  profileImage: string | null
  /** "완료" | "찍는중" | "대기" */
  status: '완료' | '찍는중' | '대기'
}

/**
 * GET /missions/active — 배열 내 미션 항목 (방 정보 + 참여 현황 포함)
 *
 * data.length === 0 → 대기 화면
 * data.length === 1 → 미션 상세 화면 바로 표시
 * data.length  > 1 → 방 선택 화면
 */
export interface ActiveMissionItem {
  id: number              // mission ID
  roomId: number
  roomName: string
  roomThumbnail: string | null
  title: string
  description: string
  /** "YYYY-MM-DD" */
  missionDate: string | null
  /** "HH:mm" */
  slotTime: string | null
  /** ISO8601 */
  deadline: string | null
  remainingSeconds: number
  totalMembers: number
  submittedCount: number
  participants: ActiveMissionParticipant[]
}

// ── Submission ────────────────────────────────────────────────────────────────

export type SubmissionStatus = 'SUBMITTED' | 'MISSED'

export interface Submission {
  id: number
  user_id: number
  room_id: number
  mission_id: number
  video_url: string           // ERD: NN (필수)
  status: SubmissionStatus | null  // ERD: nullable
  submitted_at: string | null      // ERD: nullable
}

/** Per-member participation view used in the collage / waiting screen */
export interface MemberParticipation {
  user: Pick<User, 'userId' | 'name' | 'profileImage'>
  submission?: Submission
  /** 'done' | 'recording' | 'waiting' */
  state: 'done' | 'recording' | 'waiting'
}

// ── Collage ───────────────────────────────────────────────────────────────────

export interface Collage {
  id: number
  mission_id: number
  room_id: number
  collage_video_url: string   // ERD: NN
  thumbnail: string | null    // ERD: nullable
  /** 0–100, ERD: nullable */
  participation_rate: number | null
  /** seconds, ERD: nullable */
  completion_time: number | null
  total_members: number | null     // ERD: nullable
  submitted_count: number | null   // ERD: nullable
  created_at: string | null        // ERD: nullable
}

// ── Album (앨범 목록) ──────────────────────────────────────────────────────────

/** GET /rooms/{roomId}/albums — memberProfiles 배열 내 항목 */
export interface AlbumMemberProfile {
  userId: number
  profileImage: string | null   // Nullable (O)
}

/**
 * GET /rooms/{roomId}/albums — data 배열 내 앨범 항목
 * ERD 우선: thumbnail nullable 유지
 */
export interface AlbumItem {
  /** "YYYY.MM.DD" */
  date: string
  thumbnail: string | null      // ERD: nullable
  memberProfiles: AlbumMemberProfile[]
}

// ── SynkLog ───────────────────────────────────────────────────────────────────

export type SynkLogStatus = 'PROCESSING' | 'COMPLETED'

export interface SynkLog {
  id: number
  room_id: number
  /** "YYYY-MM-DD" */
  date: string
  synklog_video_url: string | null  // ERD: nullable
  thumbnail: string | null          // ERD: nullable
  status: SynkLogStatus | null      // ERD: nullable
}

/** @deprecated CollageParticipant 사용 권장 */
export interface SynklogParticipant {
  userId: number
  name: string
  profileImage: string | null
  videoUrl: string | null
  submittedAt: string | null
  state: 'done' | 'waiting'
}

// ── Collage (GET /rooms/{roomId}/albums/{date}/collages) ─────────────────────

/** 날짜별 콜라주 API — 미션 1개 내 참여자 */
export interface CollageParticipant {
  userId: number
  name: string
  profileImage: string | null
  videoUrl: string | null
  submittedAt: string | null
  state: 'done' | 'waiting'
}

/** GET /rooms/{roomId}/albums/{date}/collages — 배열 내 항목 */
export interface CollageItem {
  missionId: number
  missionTitle: string
  /** 미션 시작 시각 (ISO) — 제출 경과 시간 계산에 사용 */
  missionStartAt: string | null
  /** 콜라주 영상 생성 상태 */
  status: 'PROCESSING' | 'COMPLETED'
  /** 생성된 콜라주 영상 URL (생성 전 null) */
  collageVideoUrl: string | null
  participants: CollageParticipant[]
}

// ── SynkLog (GET /rooms/{roomId}/albums/{date}/synklog) ──────────────────────

/**
 * GET /rooms/{roomId}/albums/{date}/synklog — API.md 기준
 * PROCESSING: synklogId, date, status, synklogVideoUrl(null)
 * COMPLETED:  + thumbnail, missions[{missionTitle}]
 */
export interface SynklogDetailResponse {
  synklogId: number
  /** "YYYY.MM.DD" */
  date: string
  status: 'PROCESSING' | 'COMPLETED'
  synklogVideoUrl: string | null
  thumbnail?: string | null
  /** COMPLETED일 때만 존재 */
  missions?: Array<{ missionTitle: string }>
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'IMAGE' | 'EMOJI'

/** WS CHAT_REACTION 이벤트 페이로드 (개별 리액션 레코드) */
export interface ChatReaction {
  id: number
  chat_id: number
  user_id: number
  emoji: string
  created_at: string
}

/**
 * GET /rooms/{roomId}/chats — reactions 배열 내 집계 리액션
 * emoji: Nullable (spec: O)
 */
export interface ChatReactionSummary {
  emoji: string | null
  count: number
}

/**
 * GET /rooms/{roomId}/chats — messages 배열 내 메시지 항목
 */
export interface RoomChatMessage {
  messageId: number
  userId: number
  userName: string
  profileImage: string | null
  content: string
  /** ISO 8601 */
  createdAt: string
  myMessage: boolean
  isMyMessage: boolean
  reactions: ChatReactionSummary[]
}

/**
 * GET /rooms/{roomId}/chats — 채팅 목록 조회 응답
 */
export interface RoomChatListResponse {
  roomName: string
  memberCount: number
  todayMissionCompleted: boolean
  /** YYYY-MM-DD, Nullable */
  todayMissionDate: string | null
  messages: RoomChatMessage[]
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

// ── Collection (도감) API 응답 ─────────────────────────────────────────────────

/** GET /collections — missions 배열 내 개별 미션 항목 */
export interface CollectionMissionItem {
  missionId: number
  title: string
  thumbnail: string         // collection_records.thumbnail
  completedTimes: number    // 완료 횟수
  /** "YYYY.MM.DD" */
  lastCompletedDate: string
}

/**
 * GET /collections — 도감 목록 조회 응답
 * { completionRate, completedCount, totalCount, missions[] }
 */
export interface CollectionListResponse {
  /** 수집률 (%) */
  completionRate: number
  completedCount: number
  totalCount: number
  missions: CollectionMissionItem[]
}

/** GET /collections/missions/{missionId} — records 배열 내 개별 기록 */
export interface CollectionRecordItem {
  recordId: number         // collection_records.id
  roomName: string         // rooms.name (joined)
  /** "YYYY.MM.DD" — collection_records.date */
  date: string
  thumbnail: string        // collection_records.thumbnail
  videoUrl: string         // submissions.video_url (joined via submission_id)
}

/**
 * GET /collections/missions/{missionId} — 미션 상세 조회 응답
 * ERD 기준: mission_templates(title, description) + collection_records + rooms + submissions
 */
export interface CollectionDetailResponse {
  missionId: number
  title: string
  description: string
  completedTimes: number
  /** "YYYY.MM.DD" */
  lastCompletedDate: string
  records: CollectionRecordItem[]
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'MISSION_START'
  | 'MISSION_COMPLETE'
  | 'SYNKLOG_CREATED'
  | 'MEMBER_JOIN'
  | 'ACHIEVEMENT'

/** GET /notifications — today/thisWeek 배열 내 알림 객체 (camelCase) */
export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  content: string
  /** ISO 8601 */
  createdAt: string
  isRead: boolean
  relatedId: number | null  // Nullable
}

/**
 * GET /notifications — 알림 목록 조회 응답
 * 서버에서 today / thisWeek 로 미리 그룹핑해서 내려줌
 */
export interface NotificationsResponse {
  today: AppNotification[]
  thisWeek: AppNotification[]
}

// ── API wrappers ──────────────────────────────────────────────────────────────

/**
 * 실제 백엔드 응답 공통 래퍼
 * { "success": true, "data": {...}, "message": "로그인 성공" }
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

// ── Auth 응답 ─────────────────────────────────────────────────────────────────

/**
 * POST /auth/kakao  |  POST /auth/google 응답
 * 기존 회원: isNewUser=false  /  신규 회원: isNewUser=true
 */
export interface LoginResponse {
  token: string
  isNewUser: boolean
  userId: number
  name: string
  profileImage: string | null
}

// ── Room 응답 ─────────────────────────────────────────────────────────────────

/**
 * POST /rooms — 방 생성 응답
 * { roomId, code, name, createdAt, thumbnail }
 */
export interface RoomCreatedResponse {
  roomId: number
  code: string
  name: string
  /** ISO 8601 e.g. "2026-05-07T22:30:00" */
  createdAt: string
  thumbnail: string | null
}

/**
 * POST /rooms/join — 방 참가 응답
 * { roomId, roomName, currentMembers, maxMembers }
 */
export interface RoomJoinedResponse {
  roomId: number
  roomName: string
  currentMembers: number
  maxMembers: number
}

/**
 * PATCH /rooms/{roomId} — 방 설정 수정 요청 (모두 optional, camelCase)
 * 응답은 data 없이 { success, message } 만 반환
 */
export interface RoomUpdateRequest {
  name?: string
  thumbnail?: string
  /** 1~5 */
  dailyMissionCount?: number
  /** HH:mm e.g. "10:00" */
  missionStartTime?: string
  /** HH:mm e.g. "22:00" */
  missionEndTime?: string
  maxMembers?: number
}

/**
 * POST /rooms/{roomId}/albums/{date}/synklog — SYNKLOG 생성 응답
 * { synklogId, status }
 */
export interface SynklogCreatedResponse {
  synklogId: number
  status: 'PROCESSING' | 'COMPLETED'
}

/**
 * POST /rooms/{roomId}/chats — 채팅 메시지 전송 응답
 * { messageId, createdAt }
 */
export interface ChatSentResponse {
  messageId: number
  /** ISO 8601 e.g. "2026-05-07T22:36:00" */
  createdAt: string
}

/**
 * POST /submissions — 미션 제출 응답
 * { id, submittedAt }
 *
 * 영상은 스토리지에 먼저 업로드 후 URL을 body에 담아 전송
 * Request: { missionId, videoUrl, roomId }
 */
export interface SubmissionCreatedResponse {
  id: number
  /** ISO 8601 e.g. "2026-05-11T23:30:45" */
  submittedAt: string
}

// ── Mission 참여 현황 ─────────────────────────────────────────────────────────

/** GET /missions/{missionId}/participants — 개별 참여자 */
export interface MissionParticipant {
  name: string
  profileImage: string | null
  /** "완료" | "미완료" */
  status: '완료' | '미완료'
}

/**
 * GET /missions/{missionId}/participants — 미션 참여 현황 응답
 * { remainingSeconds, participants }
 */
export interface MissionParticipantsResponse {
  /** 마감까지 남은 시간(초) */
  remainingSeconds: number
  participants: MissionParticipant[]
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
