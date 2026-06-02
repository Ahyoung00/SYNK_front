# SYNK — Front-end Technical Specification

## 서비스 개요
예고 없이 울리는 랜덤 알림으로 그룹 멤버들이 5분 안에 영상 미션을 수행하고,
자동 생성된 그룹 콜라주로 추억을 쌓는 소셜 앱.

---

## Tech Stack

| 레이어 | 기술 |
|---|---|
| UI | React 18 + TypeScript |
| 번들러 | Vite 6 |
| 모바일 래퍼 | Capacitor 6 |
| 상태관리 | Zustand 5 |
| 라우팅 | React Router v6 |
| 백엔드 | Spring Boot (REST + WebSocket) |
| 스타일 | CSS Modules + CSS Custom Properties |

### Zustand 선택 이유 (vs Recoil)
- 번들 크기 ~3KB (Recoil ~21KB) → 모바일 초기 로딩 유리
- Provider 불필요 → Capacitor 앱 구조에 적합
- 내장 `persist` 미들웨어로 인증 토큰 localStorage 저장 간편

---

## Directory Structure

```
src/
├── assets/            정적 에셋 (아이콘, 이미지)
├── components/
│   ├── layout/        AppLayout, BottomNav (탭바)
│   ├── ui/            Button, Avatar, Badge 등 atom 컴포넌트
│   ├── mission/       타이머, 참여 현황 카드 등 미션 전용
│   ├── collage/       그룹 콜라주 그리드 (3단계)
│   └── chat/          채팅 버블, 리액션 팝업 (4단계)
├── hooks/
│   ├── useCamera.ts   Capacitor Camera + WebRTC 폴백
│   ├── useTimer.ts    5분 카운트다운 (missionStore 연동)
│   ├── usePushNotification.ts  FCM + 웹 알림 폴백
│   └── useWebSocket.ts  방 채널 WebSocket 관리
├── pages/             라우트 단위 페이지 (폴더 = 기능 영역)
├── router/            createBrowserRouter + AuthGuard
├── services/
│   ├── api/           fetch 래퍼 + Spring Boot 엔드포인트
│   └── websocket/     재연결 지원 WS 싱글톤
├── store/             Zustand 스토어 (auth, room, mission, notification)
├── types/             index.ts — DB 스키마 기반 TypeScript 타입
├── constants/         라우트, 색상, API URL, 타이머 상수
├── utils/             공통 유틸
└── styles/            global.css — 디자인 토큰 (CSS 변수)
```

---

## Database Schema (요약)

```
users           id, name, auth_provider, profile_image, fcm_token, *_alert
rooms           id, name, code, owner_id, max_members, daily_mission_count, mission_*_time
room_members    id, user_id, room_id, is_owner
missions        id, room_id, mission_template_id, status(PENDING|ACTIVE|COMPLETED|EXPIRED), deadline
mission_templates  id, title, description
submissions     id, user_id, mission_id, video_url, status(SUBMITTED|MISSED)
collages        id, mission_id, collage_video_url, participation_rate, completion_time
synklogs        id, room_id, date, synklog_video_url, status(PROCESSING|COMPLETED)
room_chats      id, room_id, user_id, message_type(TEXT|IMAGE|EMOJI), content
chat_reactions  id, chat_id, user_id, emoji
collection_records  id, user_id, mission_template_id, room_id
notifications   id, user_id, type(MISSION_START|MISSION_COMPLETE|SYNKLOG_CREATED|MEMBER_JOIN|ACHIEVEMENT)
```

---

## Page Map (PDF 와이어프레임 기준)

| 경로 | 컴포넌트 | PDF 페이지 | 단계 |
|---|---|---|---|
| `/onboarding` | OnboardingPage | p.3 | 1 |
| `/login` | LoginPage | p.4 | 1 |
| `/` | HomePage | p.6-9, 19, 29 | 1 |
| `/mission/:roomId` | MissionDetailPage | p.10 | 2 |
| `/mission/:roomId/camera` | MissionCameraPage | p.11-12 | 2 |
| `/mission/:roomId/waiting` | MissionWaitingPage | p.13 | 2 |
| `/mission/:roomId/processing` | MissionProcessingPage | p.14 | 2 |
| `/result/:missionId` | MissionResultPage (콜라주) | p.15-16 | 3 |
| `/room/:roomId` | RoomPage | p.20 | 1 |
| `/room/:roomId/album` | RoomAlbumPage | p.21 | 1 |
| `/room/:roomId/album/:id` | SynkLogDetailPage | p.22-23 | 1 |
| `/room/:roomId/chat` | RoomChatPage | p.24 | 4 |
| `/room/:roomId/settings` | RoomSettingsPage | p.25,27,34 | 1 |
| `/room/:roomId/settings/members` | RoomMembersPage | p.26,28 | 1 |
| `/room/create` | CreateRoomPage | p.30 | 1 |
| `/room/:roomId/created` | RoomCreatedPage | p.31-32 | 1 |
| `/room/join` | JoinRoomPage | p.33 | 1 |
| `/notifications` | NotificationsPage | p.17 | 1 |
| `/collection` | CollectionPage | p.35 | 1 |
| `/collection/:id` | CollectionDetailPage | p.36 | 1 |
| `/profile` | ProfilePage | p.37 | 1 |
| `/profile/edit` | ProfileEditPage | p.38 | 1 |
| `/profile/withdraw` | WithdrawPage | p.39 | 1 |

---

## 개발 단계 계획

### [1단계] 프로젝트 구조 & 환경 세팅 ✅
- Vite + React + TypeScript + Capacitor 세팅
- Zustand 스토어 설계 (auth, room, mission, notification)
- 전체 라우팅 테이블 (react-router-dom v6)
- API 클라이언트 + WebSocket 싱글톤
- Custom hooks 뼈대 (useCamera, useTimer, usePushNotification, useWebSocket)
- 모든 페이지 stub 생성
- 디자인 토큰 (CSS Custom Properties)

### [2단계] 타임어택 UI (핵심 기능)
- 5분 카운트다운 (색상 애니메이션 포함)
- `useCamera` 완전 구현: Capacitor + WebRTC 폴백
- 3~5초 영상 촬영 + 프리뷰
- 미션 상세 → 카메라 → 대기 플로우 완성

### [3단계] 그룹 콜라주
- CSS Grid 반응형 (2~10명 분할)
- 멤버 오버레이 (참여율, 제출 시간)
- 동시 비디오 Loop 재생 최적화

### [4단계] 그룹 채팅
- WebSocket 실시간 채팅
- 가상 스크롤 / 하단 고정
- 이모지 리액션 바텀시트
- 미션 결과 배너 (채팅 내 인라인)

---

## 환경 변수 (.env.local)

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_BASE_URL=ws://localhost:8080/ws
VITE_KAKAO_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

## Capacitor 빌드 순서

```bash
npm run build          # Vite 빌드 → dist/
npx cap sync           # dist/ → iOS/Android 프로젝트에 복사
npx cap open ios       # Xcode 열기
npx cap open android   # Android Studio 열기
```
