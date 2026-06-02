# SYNK 프론트엔드 기능 명세서

> 버전: v1.0 | 작성일: 2026-06-02  
> "지금 이 순간을 함께" — 예고 없이 울리는 영상 미션으로 친구들과 일상을 기록하는 소셜 앱

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [데이터베이스 스키마](#4-데이터베이스-스키마)
5. [라우트 맵](#5-라우트-맵)
6. [기능 상세 명세](#6-기능-상세-명세)
7. [개발 단계 계획](#7-개발-단계-계획)
8. [환경 변수 및 빌드](#8-환경-변수-및-빌드)
9. [GitHub 이슈 목록](#9-github-이슈-목록)

---

## 1. 서비스 개요

예고 없이 울리는 랜덤 알림으로 그룹 멤버들이 **5분 안에 영상 미션**을 수행하고,  
자동 생성된 그룹 **콜라주**로 추억을 쌓는 소셜 앱.

- 미션은 예고 없이 발동되며 5분 제한 시간 안에 **3~5초 영상**을 촬영해 제출
- 참여자 영상은 자동으로 **콜라주(Collage)**로 합성
- 하루치 콜라주를 묶어 **SynkLog** 영상으로 생성 가능
- 미션 완료 기록은 **도감(Collection)** 에 수집 (전체 90종)

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| UI | React 18 + TypeScript |
| 번들러 | Vite 6 |
| 모바일 래퍼 | Capacitor 6 |
| 상태 관리 | Zustand 5 |
| 라우팅 | React Router v6 |
| 백엔드 연동 | Spring Boot (REST + WebSocket) |
| 스타일 | CSS Modules + CSS Custom Properties |
| 카메라 | MediaRecorder API (Web) / Capacitor Camera (Native) |
| 실시간 | WebSocket (자동 재연결, exponential backoff) |
| 알림 | Web Notification API |

### Zustand 선택 이유 (vs Recoil)

- 번들 크기 ~3KB (Recoil ~21KB) → 모바일 초기 로딩 유리
- Provider 불필요 → Capacitor 앱 구조에 적합
- 내장 `persist` 미들웨어로 인증 토큰 localStorage 저장 간편

---

## 3. 디렉토리 구조

```
src/
├── assets/            정적 에셋 (아이콘, 이미지)
├── components/
│   ├── layout/        AppLayout, BottomNav, AppHeader, NavHeader
│   ├── mission/       CountdownTimer, ParticipationRow
│   └── collage/       CollageGrid, CollageCell
├── hooks/
│   ├── useCamera.ts          Capacitor Camera + WebRTC 폴백
│   ├── useTimer.ts           5분 카운트다운
│   ├── usePushNotification.ts  Web Notification API
│   └── useWebSocket.ts       방 채널 WebSocket 관리
├── pages/
│   ├── auth/          LoginPage, OnboardingPage
│   ├── home/          HomePage
│   ├── mission/       MissionDetailPage, MissionCameraPage,
│   │                  MissionWaitingPage, MissionProcessingPage
│   ├── collage/       MissionResultPage
│   ├── room/          RoomsPage, RoomPage, CreateRoomPage,
│   │                  RoomCreatedPage, JoinRoomPage, InvitePage,
│   │                  RoomSettingsPage, RoomMembersPage
│   ├── album/         RoomAlbumPage, SynkLogDetailPage
│   ├── chat/          RoomChatPage
│   ├── collection/    CollectionPage, CollectionDetailPage
│   ├── notifications/ NotificationsPage
│   └── profile/       ProfilePage, ProfileEditPage, WithdrawPage
├── router/            createBrowserRouter + AuthGuard
├── services/
│   ├── api/           fetch 래퍼 (client.ts) + 엔드포인트 (endpoints.ts)
│   └── websocket/     재연결 지원 WS 싱글톤 (client.ts)
├── store/             authStore, roomStore, missionStore, chatStore,
│                      notificationStore, settingsStore, themeStore
├── types/             index.ts — DB 스키마 기반 TypeScript 타입
├── constants/         라우트, API URL, 타이머 상수
└── styles/            global.css — 디자인 토큰 (CSS 변수)
```

---

## 4. 데이터베이스 스키마

```
users              id, name, auth_provider, profile_image,
                   mission_notification, result_notification, highlight_notification
rooms              id, name, code, owner_id, max_members,
                   daily_mission_count, mission_start_time, mission_end_time
room_members       id, user_id, room_id, is_owner, joined_at
missions           id, room_id, mission_template_id,
                   status(PENDING|ACTIVE|COMPLETED|EXPIRED), deadline, targeted_at
mission_templates  id, title, description
submissions        id, user_id, mission_id, room_id,
                   video_url, status(SUBMITTED|MISSED), submitted_at
collages           id, mission_id, room_id, collage_video_url,
                   thumbnail, participation_rate, completion_time,
                   total_members, submitted_count
synklogs           id, room_id, date, synklog_video_url,
                   thumbnail, status(PROCESSING|COMPLETED)
room_chats         id, room_id, user_id,
                   message_type(TEXT|IMAGE|EMOJI), content
chat_reactions     id, chat_id, user_id, emoji
collection_records id, user_id, mission_template_id, room_id,
                   submission_id, date, thumbnail
notifications      id, user_id,
                   type(MISSION_START|MISSION_COMPLETE|SYNKLOG_CREATED|MEMBER_JOIN|ACHIEVEMENT),
                   title, content, is_read, related_id
```

---

## 5. 라우트 맵

```
/onboarding                          → 온보딩 (공개)
/login                               → 로그인 (공개)
/invite/:code                        → 초대 링크 (공개)

[Protected + AppLayout — 하단 탭]
├── /                                → 홈 (활성 미션)
├── /collection                      → 도감 목록
├── /collection/:missionId           → 도감 미션 상세
├── /rooms                           → 방 목록
└── /profile                         → 프로필

[Protected — 풀스크린]
├── /notifications                   → 알림
├── /room/create                     → 방 생성
├── /room/join                       → 방 참가
├── /room/:roomId                    → 방 상세
├── /room/:roomId/created            → 방 생성 완료
├── /room/:roomId/album              → 방 앨범
├── /room/:roomId/album/:date        → SynkLog 상세
├── /room/:roomId/chat               → 채팅
├── /room/:roomId/settings           → 방 설정
├── /room/:roomId/settings/members   → 멤버 관리
├── /mission/:roomId                 → 미션 상세
├── /mission/:roomId/camera          → 카메라 촬영
├── /mission/:roomId/waiting         → 대기 화면
├── /mission/:roomId/processing      → 처리 중
├── /result/:missionId               → 미션 결과 (콜라주)
├── /profile/edit                    → 프로필 편집
└── /profile/withdraw                → 회원 탈퇴
```

### PDF 와이어프레임 대응표

| 경로 | 컴포넌트 | PDF 페이지 | 개발 단계 |
|------|----------|------------|-----------|
| `/onboarding` | `OnboardingPage` | p.3 | 1 |
| `/login` | `LoginPage` | p.4 | 1 |
| `/` | `HomePage` | p.6–9, 19, 29 | 1 |
| `/mission/:roomId` | `MissionDetailPage` | p.10 | 2 |
| `/mission/:roomId/camera` | `MissionCameraPage` | p.11–12 | 2 |
| `/mission/:roomId/waiting` | `MissionWaitingPage` | p.13 | 2 |
| `/mission/:roomId/processing` | `MissionProcessingPage` | p.14 | 2 |
| `/result/:missionId` | `MissionResultPage` | p.15–16 | 3 |
| `/room/:roomId` | `RoomPage` | p.20 | 1 |
| `/room/:roomId/album` | `RoomAlbumPage` | p.21 | 1 |
| `/room/:roomId/album/:date` | `SynkLogDetailPage` | p.22–23 | 1 |
| `/room/:roomId/chat` | `RoomChatPage` | p.24 | 4 |
| `/room/:roomId/settings` | `RoomSettingsPage` | p.25, 27, 34 | 1 |
| `/room/:roomId/settings/members` | `RoomMembersPage` | p.26, 28 | 1 |
| `/room/create` | `CreateRoomPage` | p.30 | 1 |
| `/room/:roomId/created` | `RoomCreatedPage` | p.31–32 | 1 |
| `/room/join` | `JoinRoomPage` | p.33 | 1 |
| `/notifications` | `NotificationsPage` | p.17 | 1 |
| `/collection` | `CollectionPage` | p.35 | 1 |
| `/collection/:missionId` | `CollectionDetailPage` | p.36 | 1 |
| `/profile` | `ProfilePage` | p.37 | 1 |
| `/profile/edit` | `ProfileEditPage` | p.38 | 1 |
| `/profile/withdraw` | `WithdrawPage` | p.39 | 1 |

---

## 6. 기능 상세 명세

### 6-1. 인증 (Auth)

#### 온보딩
- **파일**: `src/pages/auth/OnboardingPage.tsx`
- **기능**: SYNK 서비스 소개 문구 표시, 시작하기 버튼으로 `/login` 이동

#### 카카오 OAuth 팝업 로그인
- **파일**: `src/pages/auth/LoginPage.tsx`
- **흐름**:
  1. 카카오 인증 URL 팝업 오픈 (`width=450, height=600`)
  2. `public/kakao-callback.html`에서 code 획득 후 `postMessage` 전달
  3. `POST /auth/kakao { code, redirectUri }` → JWT 발급
  4. `GET /users/me` 로 전체 프로필 로드 후 홈 이동

#### 구글 OAuth 팝업 로그인
- **파일**: `src/pages/auth/LoginPage.tsx`
- **흐름**: 카카오와 동일 구조, `public/google-callback.html` 사용, `POST /auth/google` 호출

#### AuthGuard (라우트 인증 보호)
- **파일**: `src/router/AuthGuard.tsx`, `src/router/index.tsx`
- **기능**: 비로그인 상태 보호 라우트 접근 시 `/login` 리다이렉트
- **공개 라우트**: `/onboarding`, `/login`, `/invite/:code`
- **토큰 저장**: `localStorage['synk_auth_token']` (Zustand persist)
- **세션 만료**: HTTP 401 수신 시 토큰 삭제 → `/login` 자동 리다이렉트

---

### 6-2. 홈 (Home)

- **파일**: `src/pages/home/HomePage.tsx`

#### 활성 미션 카드

| 활성 미션 수 | 표시 화면 |
|-------------|-----------|
| 0개 | 대기 안내 카드 ("아직 미션이 없어요") |
| 1개 | 인라인 미션 카드 (풀 카드) |
| 2개 이상 | 방 선택 리스트 → 선택 후 해당 카드 |

- **카운트다운 색상**: > 3분 파랑 / 1~3분 초록 / 1분 미만 빨강
- **참여 상태**: 완료 ✅ / 찍는중 ⏺ / 대기 ⏳ 아바타 표시
- **폴링**: 30초 간격 `GET /missions/active`

#### 미션 카드 버튼 분기

```
참여 전        → [참여하기] → 카메라 페이지
제출 완료      → [✓ 참여완료] + [대기 화면 보기]
타이머 만료    → [미션 완료 보기 →] → 결과 페이지
전원 완료      → "🎉 모두 완료!" + 카드 자동 제거
```

#### Push 알림
- **조건**: 미션 알림 설정 ON + 첫 로드 이후 신규 `missionId` 감지
- **구현**: `Notification.requestPermission()` + `new Notification()`
- **중복 방지**: `seenMissionIdsRef` Set으로 이미 본 미션 추적

---

### 6-3. 미션 플로우 (Mission Flow)

#### 미션 상세
- **경로**: `/mission/:roomId`
- **파일**: `src/pages/mission/MissionDetailPage.tsx`
- **기능**: 미션 제목/설명, CountdownTimer, 참여하기 버튼

#### 카메라 촬영 및 영상 제출
- **경로**: `/mission/:roomId/camera`
- **파일**: `src/pages/mission/MissionCameraPage.tsx`, `src/hooks/useCamera.ts`

| 항목 | 내용 |
|------|------|
| 최소 녹화 | 3초 (`VIDEO_MIN_S`) — 미만 시 제출 버튼 비활성화 |
| 최대 녹화 | 5초 (`VIDEO_MAX_S`) — 초과 시 자동 종료 |
| 코덱 | `video/webm;codecs=vp9` → 미지원 시 `video/webm` 폴백 |
| 카메라 방향 | 전면 기본, 전/후면 전환 |
| 네이티브 | Capacitor Camera (iOS/Android) |
| 제출 후 | 재촬영 버튼 + 내 영상 보기 |

**제출 흐름**: 녹화 완료 → Blob → S3 업로드 → `POST /submissions { missionId, videoUrl, roomId }` → 대기 화면

#### 미션 대기 화면
- **경로**: `/mission/:roomId/waiting`
- **파일**: `src/pages/mission/MissionWaitingPage.tsx`
- **기능**: `ParticipationRow`로 멤버별 제출 상태 표시, WS `MEMBER_SUBMITTED` 실시간 갱신, 재촬영/내 영상 보기 버튼

#### 미션 처리 중
- **경로**: `/mission/:roomId/processing`
- **파일**: `src/pages/mission/MissionProcessingPage.tsx`
- **기능**: 콜라주 영상 생성 중 로딩 화면

#### 미션 결과 (콜라주)
- **경로**: `/result/:missionId`
- **파일**: `src/pages/collage/MissionResultPage.tsx`
- **기능**: 콜라주 영상 재생, `CollageGrid`로 참여자별 영상 셀 표시, 참여율/완료 시간

#### 공통 컴포넌트

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `CountdownTimer` | `src/components/mission/CountdownTimer.tsx` | MM:SS 타이머 (size: sm/md/lg) |
| `ParticipationRow` | `src/components/mission/ParticipationRow.tsx` | 참여자 행 (아바타 + 이름 + 상태) |
| `CollageGrid` | `src/components/collage/CollageGrid.tsx` | 참여자 영상 그리드 |
| `CollageCell` | `src/components/collage/CollageCell.tsx` | 개별 영상 셀 |

---

### 6-4. 방 (Room)

#### 방 목록
- **경로**: `/rooms` | **파일**: `src/pages/room/RoomsPage.tsx`
- 참여중 방: 이름, 썸네일, 멤버 아바타, 오늘 미션 완료율
- 대기중 방: 현재/최대 멤버 수, 대기 인원

#### 방 상세
- **경로**: `/room/:roomId` | **파일**: `src/pages/room/RoomPage.tsx`
- 방 이름/썸네일, 멤버 아바타 목록, 최근 앨범 썸네일 그리드, 채팅/앨범/설정/초대 진입

#### 방 생성
- **경로**: `/room/create` → `/room/:roomId/created`
- **파일**: `src/pages/room/CreateRoomPage.tsx`, `src/pages/room/RoomCreatedPage.tsx`
- **설정 항목**: 방 이름(필수), 썸네일(선택), 최대 인원(1~10), 미션 시작/종료 시간(HH:mm), 일일 미션 수(1~5회)
- **완료 화면**: 생성된 방 코드 및 초대 링크 표시

#### 방 참가
- **경로**: `/room/join`, `/invite/:code`
- **파일**: `src/pages/room/JoinRoomPage.tsx`, `src/pages/room/InvitePage.tsx`
- **기능**: 6자리 코드 직접 입력 또는 초대 링크 → `POST /rooms/join { code }` → 방 상세 이동

#### 방 설정
- **경로**: `/room/:roomId/settings` | **파일**: `src/pages/room/RoomSettingsPage.tsx`
- **방장 전용**: 이름/썸네일/미션 시간/일일 미션 수 수정 (`PATCH /rooms/:roomId`), 방 삭제

#### 방 멤버 관리
- **경로**: `/room/:roomId/settings/members` | **파일**: `src/pages/room/RoomMembersPage.tsx`
- **기능**: 멤버 목록 조회, 방장의 멤버 강퇴 (`DELETE /rooms/:roomId/members/:userId`)

#### 방 역할

| 역할 | 권한 |
|------|------|
| 방장 (owner) | 방 설정 수정, 멤버 강퇴, 방 삭제 |
| 일반 멤버 | 미션 참여, 채팅, 앨범 조회, 방 나가기 |

---

### 6-5. 앨범 / SynkLog

#### 방 앨범
- **경로**: `/room/:roomId/album` | **파일**: `src/pages/album/RoomAlbumPage.tsx`
- **기능**: 날짜별 앨범 목록 (`GET /rooms/:roomId/albums`), 썸네일 그리드, 날짜 탭 → 상세

#### SynkLog 상세
- **경로**: `/room/:roomId/album/:date` | **파일**: `src/pages/album/SynkLogDetailPage.tsx`
- **기능**:
  - 날짜별 콜라주 목록 (`GET /rooms/:roomId/albums/:date/collages`)
  - SynkLog 영상 조회/재생 (`GET /rooms/:roomId/albums/:date/synklog`)
  - PROCESSING → "생성 중" 폴링 / COMPLETED → 영상 재생
  - `[+ SynkLog 생성]` 버튼 (`POST /rooms/:roomId/albums/:date/synklog`)

---

### 6-6. 채팅 (Chat)

- **경로**: `/room/:roomId/chat` | **파일**: `src/pages/chat/RoomChatPage.tsx`

| 항목 | 내용 |
|------|------|
| 메시지 조회 | `GET /rooms/:roomId/chats` |
| 메시지 전송 | `POST /rooms/:roomId/chats { content }` |
| 실시간 수신 | WS `CHAT_MESSAGE` 이벤트 |
| 메시지 캐시 | `chatStore` 방별 저장 (탭 전환 시 유지) |
| 이모지 리액션 | 롱프레스 → 팔레트 → `POST /chats/:id/reactions { emoji }` |
| WS 리액션 갱신 | `CHAT_REACTION` 이벤트 수신 |
| 오늘 미션 완료 배지 | `todayMissionCompleted` 필드 기반 |

---

### 6-7. 도감 (Collection)

#### 도감 목록
- **경로**: `/collection` | **파일**: `src/pages/collection/CollectionPage.tsx`
- **기능**: 수집률(%), 완료/전체 수, 완료 미션 카드 (`GET /collections`)
- 총 미션 템플릿: **90종** (`COLLECTION_TOTAL = 90`)

#### 도감 미션 상세
- **경로**: `/collection/:missionId` | **파일**: `src/pages/collection/CollectionDetailPage.tsx`
- **기능**: 미션 제목/설명, 완료 횟수, 기록 목록(방 이름·날짜·썸네일·영상) (`GET /collections/missions/:missionId`)

---

### 6-8. 알림 (Notifications)

#### 알림 목록
- **경로**: `/notifications` | **파일**: `src/pages/notifications/NotificationsPage.tsx`
- **기능**: 오늘/이번 주 그룹핑 알림 목록 (`GET /notifications`)
- **알림 타입**: `MISSION_START`, `MISSION_COMPLETE`, `SYNKLOG_CREATED`, `MEMBER_JOIN`, `ACHIEVEMENT`

#### 알림 설정 토글
- **파일**: `src/store/settingsStore.ts`

| 항목 | 설정 키 | 기본값 |
|------|---------|--------|
| 미션 알림 | `missionNotification` | ON |
| 결과 알림 | `resultNotification` | ON |
| 하이라이트 알림 | `highlightNotification` | ON |

- `localStorage` + `PATCH /users/me/notifications` 백엔드 동기화
- 미션 알림 OFF → 브라우저 Push 알림 미발송

---

### 6-9. 프로필 (Profile)

#### 프로필 페이지
- **경로**: `/profile` | **파일**: `src/pages/profile/ProfilePage.tsx`
- **기능**: 프로필 이미지/이름, 알림 설정 토글, 다크모드 토글, 로그아웃, 탈퇴 진입

#### 프로필 편집
- **경로**: `/profile/edit` | **파일**: `src/pages/profile/ProfileEditPage.tsx`
- **기능**: 이름 수정, 프로필 이미지 업로드/변경 (`PATCH /users/me`)

#### 회원 탈퇴
- **경로**: `/profile/withdraw` | **파일**: `src/pages/profile/WithdrawPage.tsx`
- **기능**: 탈퇴 확인 UI, 계정 삭제 (`DELETE /users/me`)

---

### 6-10. 공통 / 레이아웃

#### 라이트/다크 모드
- **파일**: `src/store/themeStore.ts`, `src/styles/global.css`
- CSS 변수 (`--color-bg`, `--color-text` 등) 기반 테마 전환, `localStorage` 저장

#### 하단 탭 네비게이션
- **파일**: `src/components/layout/BottomNav.tsx`, `src/components/layout/AppLayout.tsx`
- 탭: 홈(`/`) / 도감(`/collection`) / 방(`/rooms`) / 마이(`/profile`)

#### 앱 헤더 / NavHeader
- **파일**: `src/components/layout/AppHeader.tsx`, `src/components/layout/NavHeader.tsx`
- `AppHeader`: 로고, 알림 벨, 부제목 (탭 레이아웃용)
- `NavHeader`: 뒤로가기 버튼, 페이지 타이틀 (풀스크린 페이지용)

#### Zustand 스토어

| 스토어 | 파일 | 관리 상태 | persist |
|--------|------|-----------|---------|
| `authStore` | `src/store/authStore.ts` | 유저 정보, JWT 토큰 | ✅ |
| `settingsStore` | `src/store/settingsStore.ts` | 알림 ON/OFF | ✅ |
| `themeStore` | `src/store/themeStore.ts` | 라이트/다크 테마 | ✅ |
| `missionStore` | `src/store/missionStore.ts` | 활성 미션 상태 | ❌ |
| `chatStore` | `src/store/chatStore.ts` | 방별 채팅 캐시 | ❌ |
| `roomStore` | `src/store/roomStore.ts` | 방 목록/상세 캐시 | ❌ |
| `notificationStore` | `src/store/notificationStore.ts` | 알림 목록 | ❌ |

#### API 클라이언트
- **파일**: `src/services/api/client.ts`, `src/services/api/endpoints.ts`
- `baseURL`: `VITE_API_BASE_URL` 환경변수
- 모든 요청에 `Authorization: Bearer {JWT}` 자동 주입
- 401 수신 시 토큰 삭제 → `/login` 리다이렉트

#### WebSocket 클라이언트
- **파일**: `src/services/websocket/client.ts`, `src/hooks/useWebSocket.ts`
- URL: `{WS_BASE_URL}/rooms/{roomId}?token={JWT}`
- 자동 재연결: 지수 백오프 (1s → 2s → 4s → ... → 최대 30s)
- 이벤트: `MISSION_FIRED`, `MEMBER_SUBMITTED`, `MISSION_COMPLETED`, `CHAT_MESSAGE`, `CHAT_REACTION`, `MEMBER_JOINED`, `MEMBER_LEFT`

---

## 7. 개발 단계 계획

### 1단계 — 프로젝트 구조 & 환경 세팅 ✅
- Vite + React + TypeScript + Capacitor 세팅
- Zustand 스토어 설계 (auth, room, mission, notification)
- 전체 라우팅 테이블 (react-router-dom v6)
- API 클라이언트 + WebSocket 싱글톤
- Custom hooks 뼈대 (useCamera, useTimer, usePushNotification, useWebSocket)
- 모든 페이지 stub 생성, 디자인 토큰 (CSS Custom Properties)
- 방 CRUD, 초대 코드, 앨범, 알림, 도감, 프로필 페이지

### 2단계 — 타임어택 UI (핵심 기능) ✅
- 5분 카운트다운 (색상 애니메이션 포함)
- `useCamera` 완전 구현: Capacitor + WebRTC 폴백
- 3~5초 영상 촬영 + 프리뷰
- 미션 상세 → 카메라 → 대기 플로우 완성
- 카카오/구글 OAuth 팝업 로그인

### 3단계 — 그룹 콜라주 ✅
- CSS Grid 반응형 (2~10명 분할)
- 멤버 오버레이 (참여율, 제출 시간)
- 동시 비디오 Loop 재생 최적화
- SynkLog 생성 및 상세 화면

### 4단계 — 그룹 채팅 ✅
- WebSocket 실시간 채팅
- 이모지 리액션
- 미션 결과 배너 (채팅 내 오늘 미션 완료 배지)
- 라이트/다크 모드 토글

---

## 8. 환경 변수 및 빌드

### 환경 변수 (`.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8080/api   # REST API 베이스 URL
VITE_WS_BASE_URL=ws://localhost:8080/ws       # WebSocket 베이스 URL
VITE_KAKAO_JS_KEY=<kakao_javascript_key>      # 카카오 앱 JS 키
VITE_GOOGLE_CLIENT_ID=<google_client_id>      # 구글 OAuth 클라이언트 ID
```

### 앱 상수 (`src/constants/index.ts`)

| 상수 | 값 | 설명 |
|------|----|------|
| `MISSION_DURATION_S` | 300 | 미션 제한 시간 (5분) |
| `VIDEO_MIN_S` | 3 | 최소 녹화 시간 (초) |
| `VIDEO_MAX_S` | 5 | 최대 녹화 시간 (초) |
| `ROOM_MAX_MEMBERS` | 10 | 방 최대 인원 |
| `COLLECTION_TOTAL` | 90 | 전체 미션 템플릿 수 |

### Capacitor 빌드

```bash
npm run build        # Vite 빌드 → dist/
npx cap sync         # dist/ → iOS/Android 프로젝트 복사
npx cap open ios     # Xcode 열기
npx cap open android # Android Studio 열기
```

---

## 9. GitHub 이슈 목록

전체: <https://github.com/Ahyoung00/SYNK_v1/issues?state=closed>

| # | 제목 | 카테고리 |
|---|------|----------|
| [#1](https://github.com/Ahyoung00/SYNK_v1/issues/1) | feat: 온보딩 페이지 구현 | Auth |
| [#2](https://github.com/Ahyoung00/SYNK_v1/issues/2) | feat: 카카오 OAuth 팝업 로그인 구현 | Auth |
| [#3](https://github.com/Ahyoung00/SYNK_v1/issues/3) | feat: 구글 OAuth 팝업 로그인 구현 | Auth |
| [#4](https://github.com/Ahyoung00/SYNK_v1/issues/4) | feat: 홈 화면 활성 미션 카드 및 실시간 카운트다운 구현 | 홈 |
| [#5](https://github.com/Ahyoung00/SYNK_v1/issues/5) | feat: 다중 미션 발생 시 방 선택 화면 구현 | 홈 |
| [#6](https://github.com/Ahyoung00/SYNK_v1/issues/6) | feat: 미션 발생 브라우저 Push 알림 구현 | 홈 |
| [#7](https://github.com/Ahyoung00/SYNK_v1/issues/7) | feat: 미션 상세 페이지 구현 | 미션 |
| [#8](https://github.com/Ahyoung00/SYNK_v1/issues/8) | feat: 미션 카메라 촬영 및 영상 제출 기능 구현 | 미션 |
| [#9](https://github.com/Ahyoung00/SYNK_v1/issues/9) | feat: 미션 제출 후 재촬영 및 내 영상 보기 기능 추가 | 미션 |
| [#10](https://github.com/Ahyoung00/SYNK_v1/issues/10) | feat: 미션 대기 화면(실시간 참여 현황) 구현 | 미션 |
| [#11](https://github.com/Ahyoung00/SYNK_v1/issues/11) | feat: 미션 처리 중 화면 구현 | 미션 |
| [#12](https://github.com/Ahyoung00/SYNK_v1/issues/12) | feat: 미션 결과(콜라주) 화면 구현 | 미션 |
| [#13](https://github.com/Ahyoung00/SYNK_v1/issues/13) | feat: 방 목록(참여중/대기중) 페이지 구현 | 방 |
| [#14](https://github.com/Ahyoung00/SYNK_v1/issues/14) | feat: 방 상세 페이지 구현 | 방 |
| [#15](https://github.com/Ahyoung00/SYNK_v1/issues/15) | feat: 방 생성 페이지 구현 | 방 |
| [#16](https://github.com/Ahyoung00/SYNK_v1/issues/16) | feat: 초대 코드로 방 참가 기능 구현 | 방 |
| [#17](https://github.com/Ahyoung00/SYNK_v1/issues/17) | feat: 방 설정(이름/썸네일/미션 시간 수정) 페이지 구현 | 방 |
| [#18](https://github.com/Ahyoung00/SYNK_v1/issues/18) | feat: 방 멤버 관리 페이지 구현 | 방 |
| [#19](https://github.com/Ahyoung00/SYNK_v1/issues/19) | feat: 방 앨범(날짜별 콜라주 목록) 페이지 구현 | 앨범 |
| [#20](https://github.com/Ahyoung00/SYNK_v1/issues/20) | feat: SynkLog 상세 페이지 구현 | 앨범 |
| [#21](https://github.com/Ahyoung00/SYNK_v1/issues/21) | feat: SynkLog 생성 버튼 추가 | 앨범 |
| [#22](https://github.com/Ahyoung00/SYNK_v1/issues/22) | feat: 방 채팅 페이지 구현(WebSocket 실시간 메시지) | 채팅 |
| [#23](https://github.com/Ahyoung00/SYNK_v1/issues/23) | feat: 채팅 이모지 리액션 기능 구현 | 채팅 |
| [#24](https://github.com/Ahyoung00/SYNK_v1/issues/24) | feat: 도감 목록 페이지 구현 | 도감 |
| [#25](https://github.com/Ahyoung00/SYNK_v1/issues/25) | feat: 도감 미션 상세 페이지 구현 | 도감 |
| [#26](https://github.com/Ahyoung00/SYNK_v1/issues/26) | feat: 알림 목록 페이지 구현 | 알림 |
| [#27](https://github.com/Ahyoung00/SYNK_v1/issues/27) | feat: 알림 설정 토글 localStorage 연동 구현 | 알림 |
| [#28](https://github.com/Ahyoung00/SYNK_v1/issues/28) | feat: 프로필 페이지 구현 | 프로필 |
| [#29](https://github.com/Ahyoung00/SYNK_v1/issues/29) | feat: 프로필 편집(이름/프로필 이미지 변경) 페이지 구현 | 프로필 |
| [#30](https://github.com/Ahyoung00/SYNK_v1/issues/30) | feat: 회원 탈퇴 기능 구현 | 프로필 |
| [#31](https://github.com/Ahyoung00/SYNK_v1/issues/31) | feat: 라이트/다크 모드 테마 토글 구현 | 공통 |
| [#32](https://github.com/Ahyoung00/SYNK_v1/issues/32) | feat: 하단 탭 네비게이션(홈/도감/방/마이) 구현 | 공통 |
| [#33](https://github.com/Ahyoung00/SYNK_v1/issues/33) | feat: 앱 헤더 및 NavHeader 컴포넌트 구현 | 공통 |
| [#34](https://github.com/Ahyoung00/SYNK_v1/issues/34) | fix: 스크롤 처리 개선 | 공통 |
| [#35](https://github.com/Ahyoung00/SYNK_v1/issues/35) | fix: 멤버 프로필 이미지 적용 수정 | 공통 |
| [#36](https://github.com/Ahyoung00/SYNK_v1/issues/36) | feat: 방 생성/설정 시 프로필 이미지(썸네일) 변경 기능 추가 | 방 |
| [#37](https://github.com/Ahyoung00/SYNK_v1/issues/37) | feat: AuthGuard 및 라우터 인증 보호 구현 | Auth |
| [#38](https://github.com/Ahyoung00/SYNK_v1/issues/38) | feat: 백엔드 연동 baseURL 설정 및 Vite host 고정 | 공통 |
