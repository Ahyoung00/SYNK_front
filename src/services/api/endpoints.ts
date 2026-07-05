import { api } from './client'
import type {
  User,
  RoomDetail,
  RoomsMyResponse,
  RoomMemberItem,
  Submission,
  AlbumItem,
  SynklogDetailResponse,
  CollageItem,
  RoomChatListResponse,
  CollectionListResponse,
  CollectionDetailResponse,
  MySynklogItem,
  LoginResponse,
  RefreshResponse,
  RoomCreatedResponse,
  RoomJoinedResponse,
  RoomUpdateRequest,
  SynklogCreatedResponse,
  ChatSentResponse,
  SubmissionCreatedResponse,
  MissionParticipantsResponse,
  NotificationsResponse,
  ActiveMissionItem,
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────
// POST /auth/kakao  — 카카오 액세스 토큰으로 로그인/회원가입
// POST /auth/google — Google 액세스 토큰으로 로그인/회원가입
// POST /auth/logout — 로그아웃
//
// Request body:  { "accessToken": "ya29.a0AfH6..." }  ← camelCase
// Response data: { token, isNewUser, userId, name, profileImage }

export const authApi = {
  /** 카카오 OAuth authorization code로 로그인/회원가입 */
  kakaoLogin: (code: string, redirectUri: string) =>
    api.post<LoginResponse>('/auth/kakao', { code, redirectUri }),

  /** Google OAuth authorization code로 로그인/회원가입 */
  googleLogin: (code: string, redirectUri: string) =>
    api.post<LoginResponse>('/auth/google', { code, redirectUri }),

  logout: () => api.post<void>('/auth/logout'),

  /** Refresh Token으로 새 Access Token 발급 — POST /auth/refresh */
  refresh: (refreshToken: string) =>
    api.post<RefreshResponse>('/auth/refresh', { refreshToken }),
}

// ── User ──────────────────────────────────────────────────────────────────────
// GET    /users/me                  — 내 프로필 조회
// PATCH  /users/me                  — 프로필 수정
// PATCH  /users/me/notifications    — 알림 설정 수정
// DELETE /users/me                  — 회원 탈퇴

export const userApi = {
  getMe: () => api.get<User>('/users/me'),

  /**
   * 프로필 수정 — PATCH /users/me
   * Request (모두 optional): { name, username, profileImage }
   * Response: data 없음 — { success, message: "프로필 수정 완료" }
   */
  updateProfile: (data: { name?: string; profileImage?: string }) =>
    api.patch<void>('/users/me', data),

  /**
   * 알림 설정 수정 — PATCH /users/me/notifications
   * Request (모두 optional): { missionNotification, resultNotification, highlightNotification }
   * Response: data 없음 — { success, message: "알림 설정 변경 완료" }
   */
  updateNotificationSettings: (data: {
    missionNotification?: boolean
    resultNotification?: boolean
    highlightNotification?: boolean
  }) => api.patch<void>('/users/me/notifications', data),

  withdraw: () => api.delete<void>('/users/me'),

  /** FCM 토큰 등록/갱신 — PUT /users/fcm-token */
  updateFcmToken: (fcmToken: string) => api.put<void>('/users/fcm-token', { fcmToken }),
}

// ── Room ──────────────────────────────────────────────────────────────────────
// GET    /rooms/my               — 내가 참여한 방 목록 (참여중/대기중 구분)
// GET    /rooms/{roomId}         — 방 상세 조회
// POST   /rooms                  — 방 생성
// PATCH  /rooms/{roomId}         — 방 설정 수정 (방장만)
// POST   /rooms/join             — 초대 코드로 방 참여
// DELETE /rooms/{roomId}/leave   — 방 나가기
// GET    /rooms/{roomId}/invite  — 초대 정보 조회
//
// 멤버 관리 (스펙 미확정 — 추후 백엔드 추가 예정)
// GET    /rooms/{roomId}/members
// DELETE /rooms/{roomId}/members/{userId}  — 강퇴

export const roomApi = {
  /** GET /rooms/my — { active[], waiting[] } */
  getMyRooms: () => api.get<RoomsMyResponse>('/rooms/my'),

  /** GET /rooms/{roomId} — 방 상세 (camelCase, members 포함) */
  getRoom: (roomId: number) => api.get<RoomDetail>(`/rooms/${roomId}`),

  /**
   * 방 생성
   * Request (camelCase):  { name, maxMembers, dailyMissionCount, missionStartTime(HH:mm), missionEndTime(HH:mm) }
   * Response: RoomCreatedResponse { roomId, code, name, createdAt, thumbnail }
   */
  createRoom: (data: {
    name: string
    maxMembers: number
    dailyMissionCount: number
    /** HH:mm 형식 e.g. "10:00" */
    missionStartTime: string
    /** HH:mm 형식 e.g. "22:00" */
    missionEndTime: string
  }) => api.post<RoomCreatedResponse>('/rooms', data),

  /**
   * 초대 코드로 방 참가
   * Request: { code } — 최대 6자리
   * Response: RoomJoinedResponse { roomId, roomName, currentMembers, maxMembers }
   */
  joinRoom: (code: string) => api.post<RoomJoinedResponse>('/rooms/join', { code }),

  leaveRoom: (roomId: number) => api.delete<void>(`/rooms/${roomId}/leave`),

  /** 방 삭제 (방장 전용) */
  deleteRoom: (roomId: number) => api.delete<void>(`/rooms/${roomId}`),

  /**
   * 방 설정 수정 (방장만)
   * Request (camelCase, 모두 optional): { name, thumbnail, dailyMissionCount, missionStartTime, missionEndTime }
   * Response: data 없음 — { success, message: "방 설정 수정 완료" }
   */
  updateRoom: (roomId: number, data: RoomUpdateRequest) =>
    api.patch<void>(`/rooms/${roomId}`, data),

  /** GET /rooms/{roomId}/invite — { roomId, roomName, code, inviteUrl, thumbnail } */
  getInvite: (roomId: number) =>
    api.get<{ roomId: number; roomName: string; code: string; inviteUrl: string; thumbnail: string | null }>(`/rooms/${roomId}/invite`),

  getMembers: (roomId: number) => api.get<RoomMemberItem[]>(`/rooms/${roomId}/members`),

  /** 스펙 미확정 */
  kickMember: (roomId: number, userId: number) =>
    api.delete<void>(`/rooms/${roomId}/members/${userId}`),

  /** [테스트용] POST /rooms/{roomId}/test-notification — 방 멤버 전원 FCM 알림 발송 */
  testNotification: (roomId: number) =>
    api.post<void>(`/rooms/${roomId}/test-notification`),
}

// ── Mission ───────────────────────────────────────────────────────────────────
// GET /missions/active?roomId={roomId}
//   roomId 없으면 내 모든 방의 진행 중인 미션
//   roomId 있으면 특정 방의 진행 중인 미션
//   응답이 1개면 첫 번째 사진, 2개 이상이면 두 번째 사진 (프론트에서 분기)

export const missionApi = {
  /**
   * 진행 중인 미션 조회 — GET /missions/active
   * 항상 배열로 반환 (내가 속한 모든 방의 active 미션)
   *
   * data.length === 0 → 대기 화면
   * data.length === 1 → 미션 상세 화면 바로 표시
   * data.length  > 1 → 방 선택 화면
   */
  getActiveMission: () =>
    api.get<ActiveMissionItem[]>('/missions/active'),

  /**
   * 미션 콜라주 조회 — GET /missions/{missionId}/collage
   * 알림 "결과 보기" 딥링크용
   */
  getMissionCollage: (missionId: number) =>
    api.get<{
      missionId: number
      missionTitle: string
      missionStartAt: string | null
      status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
      collageVideoUrl: string | null
      thumbnail: string | null
      participants: import('@/types').CollageParticipant[]
      totalMembers: number
      submittedCount: number
    }>(`/missions/${missionId}/collage`),

  /**
   * 미션 영상 제출 — POST /submissions
   * 영상은 스토리지(S3 등)에 먼저 업로드 후 videoUrl을 body에 담아 전송
   * Request (camelCase): { missionId, videoUrl, roomId }
   * Response: { id, submittedAt }
   */
  submitVideo: (data: {
    missionId: number
    /** 스토리지 업로드 완료 후 받은 URL (3~5초 영상) */
    videoUrl: string
    roomId: number
    /** 녹화된 영상의 실제 픽셀 width > height 인 경우 true — Lambda 회전 판단 기준 */
    horizontal: boolean
    /** 녹화된 영상의 실제 픽셀 가로 크기 */
    width: number
    /** 녹화된 영상의 실제 픽셀 세로 크기 */
    height: number
    /** 사용한 카메라 — "user"(전면/셀카) | "environment"(후면). 회전 방향·미러 판단용 */
    facingMode: 'user' | 'environment'
  }) => api.post<SubmissionCreatedResponse>('/submissions', data),

  /**
   * 미션 제출 현황 조회 — GET /submissions/missions/{missionId}
   * Path: missionId (필수), roomId (선택)
   * Response: { remainingSeconds, participants: [{ name, profileImage, status }] }
   */
  getMissionSubmissions: (missionId: number) =>
    api.get<MissionParticipantsResponse>(`/submissions/missions/${missionId}`),

  /** 콜라주에서 특정 사용자의 영상 조회 — GET /submissions/{submissionId} */
  getSubmission: (submissionId: number) =>
    api.get<Submission>(`/submissions/${submissionId}`),
}

// ── Album / SynkLog / Collage ─────────────────────────────────────────────────
// GET  /rooms/{roomId}/albums                        — 날짜별 앨범 목록
// GET  /rooms/{roomId}/albums/{date}/collages         — 날짜별 미션 콜라주 + 참여자 (신규)
// GET  /rooms/{roomId}/albums/{date}/synklog          — SYNKLOG 조회 (폴링용)
// POST /rooms/{roomId}/albums/{date}/synklog          — SYNKLOG 생성 요청

export const albumApi = {
  /**
   * 방의 날짜별 앨범 목록 — GET /rooms/{roomId}/albums
   * Response: { date("YYYY.MM.DD"), thumbnail, memberProfiles[] }[]
   */
  getAlbums: (roomId: number) =>
    api.get<AlbumItem[]>(`/rooms/${roomId}/albums`),

  /** 최근 콜라주 썸네일 최대 limit개 — GET /rooms/{roomId}/albums/recent?limit=N */
  getRecentAlbums: (roomId: number, limit = 4) =>
    api.get<AlbumItem[]>(`/rooms/${roomId}/albums/recent?limit=${limit}`),

  /**
   * 날짜별 미션 콜라주 + 참여자 조회 — GET /rooms/{roomId}/albums/{date}/collages
   * Response: CollageItem[] (missionId, missionTitle, status, collageVideoUrl, participants[])
   */
  getCollages: (roomId: number, date: string) =>
    api.get<CollageItem[]>(`/rooms/${roomId}/albums/${date}/collages`),

  /**
   * 특정 날짜 SYNKLOG 조회 (폴링용) — GET /rooms/{roomId}/albums/{date}/synklog
   * PROCESSING: { synklogId, date, status, synklogVideoUrl: null }
   * COMPLETED:  { synklogId, date, status, synklogVideoUrl, thumbnail, missions[{missionTitle}] }
   * 없으면 404
   */
  getSynklog: (roomId: number, date: string) =>
    api.get<SynklogDetailResponse>(`/rooms/${roomId}/albums/${date}/synklog`),

  /**
   * SYNKLOG 생성 요청 — POST /rooms/{roomId}/albums/{date}/synklog
   * Request: { missionIds: number[] }
   * Response: { synklogId, status: "PROCESSING" | "COMPLETED" }
   */
  createSynklog: (roomId: number, date: string, body?: { missionIds: number[] }) =>
    api.post<SynklogCreatedResponse>(`/rooms/${roomId}/albums/${date}/synklog`, body),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
// GET  /rooms/{roomId}/chats                             — 채팅 메시지 목록
// POST /rooms/{roomId}/chats                             — 채팅 메시지 전송

export const chatApi = {
  /**
   * 채팅 메시지 목록 조회 — GET /rooms/{roomId}/chats
   * Response: { roomName, memberCount, todayMissionCompleted, todayMissionDate, messages[] }
   */
  getMessages: (roomId: number) =>
    api.get<RoomChatListResponse>(`/rooms/${roomId}/chats`),

  /**
   * 채팅 메시지 전송
   * Request: { content }  (message_type 없음 — 스펙에 없음)
   * Response: { messageId, createdAt }
   */
  sendMessage: (roomId: number, content: string) =>
    api.post<ChatSentResponse>(`/rooms/${roomId}/chats`, { content }),
}

// ── Collection (도감) ─────────────────────────────────────────────────────────
// GET /collections                       — 내가 완료한 미션 도감 목록
// GET /collections/missions/{missionId}  — 특정 미션 상세 + 내 기록

export const collectionApi = {
  /**
   * 도감 목록 조회 — GET /collections
   * Response: { completionRate, completedCount, totalCount, missions[] }
   */
  getMyCollection: () => api.get<CollectionListResponse>('/collections'),

  /**
   * 미션 상세 조회 — GET /collections/missions/{missionId}
   * Response: { missionId, title, category, description, completedTimes, lastCompletedDate, records[] }
   */
  getMissionDetail: (missionId: number) =>
    api.get<CollectionDetailResponse>(`/collections/missions/${missionId}`),

  getMySynklogs: () => api.get<MySynklogItem[]>('/collections/synklogs'),
}

// ── Debug (개발 전용) ──────────────────────────────────────────────────────────

export const debugApi = {
  /**
   * 미션 강제 발동 — POST /debug/rooms/{roomId}/trigger-mission
   * mock 서버 전용. 즉시 ACTIVE 미션 생성 (5분 타이머)
   * Response: { missionId, title }
   */
  triggerMission: (roomId: number) =>
    api.post<{ missionId: number; title: string }>(`/debug/rooms/${roomId}/trigger-mission`),
}

// ── Notifications ─────────────────────────────────────────────────────────────
// GET /notifications — 알림 목록 (오늘/이번 주 구분은 프론트에서 처리)

export const notificationApi = {
  /**
   * 알림 목록 조회 — GET /notifications
   * 서버에서 today / thisWeek 로 미리 그룹핑
   * Response: { today: AppNotification[], thisWeek: AppNotification[] }
   */
  getNotifications: () => api.get<NotificationsResponse>('/notifications'),

  /** 스펙 미확정 */
  markRead: (notificationId: number) =>
    api.patch<void>(`/notifications/${notificationId}/read`),

  /** 스펙 미확정 */
  markAllRead: () => api.patch<void>('/notifications/read-all'),
}

// ── Upload ────────────────────────────────────────────────────────────────────
// GET /upload/presigned-url?filename=&type= — S3 Presigned URL 발급

export const uploadApi = {
  getPresignedUrl: async (filename: string, type: 'profile' | 'room' | 'video' = 'profile') => {
    const res = await api.get<{ presignedUrl: string; fileUrl: string }>(
      `/upload/presigned-url?filename=${encodeURIComponent(filename)}&type=${type}`,
    )
    return res.data
  },
}
