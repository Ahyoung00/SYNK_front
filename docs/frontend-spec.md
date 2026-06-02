# SYNK 프론트엔드 기능 명세서

> 버전: v1.0 | 작성일: 2026-06-02  
> 기술 스택: React 18 + TypeScript + Vite + React Router v6 + Zustand

---

## 목차

1. [인증 (Auth)](#1-인증-auth)
2. [홈 (Home)](#2-홈-home)
3. [미션 플로우 (Mission Flow)](#3-미션-플로우-mission-flow)
4. [방 (Room)](#4-방-room)
5. [앨범 / SynkLog](#5-앨범--synklog)
6. [채팅 (Chat)](#6-채팅-chat)
7. [도감 (Collection)](#7-도감-collection)
8. [알림 (Notifications)](#8-알림-notifications)
9. [프로필 (Profile)](#9-프로필-profile)
10. [공통 / 레이아웃](#10-공통--레이아웃)

---

## 1. 인증 (Auth)

### 1-1. 온보딩 페이지
- **경로**: `/onboarding`
- **파일**: `src/pages/auth/OnboardingPage.tsx`
- **기능**: SYNK 서비스 소개 문구 표시, 시작하기 버튼으로 `/login` 이동

### 1-2. 카카오 OAuth 팝업 로그인
- **경로**: `/login`
- **파일**: `src/pages/auth/LoginPage.tsx`
- **흐름**:
  1. 카카오 인증 URL 팝업 오픈 (`width=450, height=600`)
  2. `kakao-callback.html`에서 code 획득 후 `postMessage` 전달
  3. 백엔드 `POST /auth/kakao` 호출 → JWT 발급
  4. `GET /users/me`로 전체 프로필 로드 후 홈 이동

### 1-3. 구글 OAuth 팝업 로그인
- **경로**: `/login`
- **파일**: `src/pages/auth/LoginPage.tsx`
- **흐름**: 카카오와 동일 구조, `google-callback.html` 사용, `POST /auth/google` 호출

### 1-4. AuthGuard (라우트 인증 보호)
- **파일**: `src/router/AuthGuard.tsx`, `src/router/index.tsx`
- **기능**: 비로그인 상태에서 보호 라우트 접근 시 `/login`으로 리다이렉트
- **공개 라우트**: `/onboarding`, `/login`, `/invite/:code`

---

## 2. 홈 (Home)

### 2-1. 활성 미션 카드
- **경로**: `/`
- **파일**: `src/pages/home/HomePage.tsx`
- **상태별 화면**:
  | 상태 | 화면 |
  |------|------|
  | 미션 없음 | 대기 안내 카드 |
  | 미션 1개 | 인라인 미션 카드 (풀 카드) |
  | 미션 2개 이상 | 방 선택 리스트 → 선택 후 인라인 카드 |
- **카운트다운 색상**: 남은 시간 > 3분 파랑 / 1~3분 초록 / 1분 미만 빨강
- **참여 상태**: 완료 / 찍는중 / 대기 아바타 표시
- **폴링**: 30초 간격으로 `GET /missions/active` 호출

### 2-2. 미션 발생 Push 알림
- **파일**: `src/pages/home/HomePage.tsx`
- **조건**: 설정에서 미션 알림 ON이고, 첫 로드 이후 신규 미션 감지 시
- **구현**: `Notification API` (`Notification.requestPermission()` + `new Notification()`)
- **중복 방지**: `seenMissionIdsRef`로 이미 본 미션 ID 추적

### 2-3. 다중 미션 방 선택 화면
- **조건**: `activeMissions.length > 1`
- **표시 정보**: 방 썸네일, 방 이름, 미션 제목, 완료 인원, 타이머 (색상 동일)

---

## 3. 미션 플로우 (Mission Flow)

### 3-1. 미션 상세 페이지
- **경로**: `/mission/:roomId`
- **파일**: `src/pages/mission/MissionDetailPage.tsx`
- **기능**: 미션 제목/설명, CountdownTimer, 참여하기 버튼 → 카메라 페이지 이동

### 3-2. 미션 카메라 촬영 및 제출
- **경로**: `/mission/:roomId/camera`
- **파일**: `src/pages/mission/MissionCameraPage.tsx`, `src/hooks/useCamera.ts`
- **기능**:
  - `MediaRecorder` API 기반 영상 녹화
  - 녹화 미리보기 및 재촬영
  - 내 영상 보기 (제출 후)
  - `POST /submissions` 제출 후 대기 화면 이동

### 3-3. 미션 대기 화면
- **경로**: `/mission/:roomId/waiting`
- **파일**: `src/pages/mission/MissionWaitingPage.tsx`
- **기능**: 멤버별 제출 상태 실시간 표시 (ParticipationRow), CountdownTimer

### 3-4. 미션 처리 중 화면
- **경로**: `/mission/:roomId/processing`
- **파일**: `src/pages/mission/MissionProcessingPage.tsx`
- **기능**: 콜라주 영상 생성 중 로딩 화면

### 3-5. 미션 결과 (콜라주) 화면
- **경로**: `/result/:missionId`
- **파일**: `src/pages/collage/MissionResultPage.tsx`
- **기능**: 콜라주 영상 재생, CollageGrid로 참여자별 영상 셀 표시, 참여율/완료 시간 표시

### 3-6. 공통 컴포넌트
| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `CountdownTimer` | `src/components/mission/CountdownTimer.tsx` | 남은 초 기반 MM:SS 타이머 (size: sm/md/lg) |
| `ParticipationRow` | `src/components/mission/ParticipationRow.tsx` | 미션 참여자 행 (아바타 + 이름 + 상태) |
| `CollageGrid` | `src/components/collage/CollageGrid.tsx` | 참여자 영상 그리드 |
| `CollageCell` | `src/components/collage/CollageCell.tsx` | 개별 영상 셀 |

---

## 4. 방 (Room)

### 4-1. 방 목록 페이지
- **경로**: `/rooms`
- **파일**: `src/pages/room/RoomsPage.tsx`
- **기능**:
  - 참여중 방: 방 이름, 썸네일, 멤버 아바타, 미션 완료율 표시
  - 대기중 방: 현재/최대 멤버 수, 대기 인원 표시
  - 방 생성 / 코드로 참가 버튼

### 4-2. 방 상세 페이지
- **경로**: `/room/:roomId`
- **파일**: `src/pages/room/RoomPage.tsx`
- **기능**: 방 이름/썸네일, 멤버 아바타 목록, 최근 앨범 썸네일 그리드, 채팅/앨범/설정 진입

### 4-3. 방 생성 페이지
- **경로**: `/room/create` → `/room/:roomId/created`
- **파일**: `src/pages/room/CreateRoomPage.tsx`, `src/pages/room/RoomCreatedPage.tsx`
- **설정 항목**: 방 이름, 썸네일 이미지, 최대 인원(1~10), 미션 시작/종료 시간, 일일 미션 수(1~5)
- **완료 화면**: 생성된 방 코드 및 초대 링크 표시

### 4-4. 방 참가 (초대 코드)
- **경로**: `/room/join`, `/invite/:code`
- **파일**: `src/pages/room/JoinRoomPage.tsx`, `src/pages/room/InvitePage.tsx`
- **기능**: 6자리 코드 입력 또는 초대 링크 접근 → `POST /rooms/join` → 방 상세 이동

### 4-5. 방 설정 페이지
- **경로**: `/room/:roomId/settings`
- **파일**: `src/pages/room/RoomSettingsPage.tsx`
- **기능**: 방 이름/썸네일/미션 시간/일일 미션 수 수정 (`PATCH /rooms/:roomId`), 방장 전용

### 4-6. 방 멤버 관리 페이지
- **경로**: `/room/:roomId/settings/members`
- **파일**: `src/pages/room/RoomMembersPage.tsx`
- **기능**: 멤버 목록 조회, 방장의 멤버 강퇴

---

## 5. 앨범 / SynkLog

### 5-1. 방 앨범 페이지
- **경로**: `/room/:roomId/album`
- **파일**: `src/pages/album/RoomAlbumPage.tsx`
- **기능**: 날짜별 앨범 목록 (`GET /rooms/:roomId/albums`), 썸네일 그리드, 날짜 선택 → SynkLog 상세 이동

### 5-2. SynkLog 상세 페이지
- **경로**: `/room/:roomId/album/:date`
- **파일**: `src/pages/album/SynkLogDetailPage.tsx`
- **기능**:
  - 날짜별 콜라주 목록 (`GET /rooms/:roomId/albums/:date/collages`)
  - SynkLog 영상 조회/재생 (`GET /rooms/:roomId/albums/:date/synklog`)
  - PROCESSING 상태 시 처리 중 표시 / COMPLETED 시 영상 재생
  - SynkLog 생성 버튼 (`POST /rooms/:roomId/albums/:date/synklog`)

---

## 6. 채팅 (Chat)

### 6-1. 방 채팅 페이지
- **경로**: `/room/:roomId/chat`
- **파일**: `src/pages/chat/RoomChatPage.tsx`
- **기능**:
  - 메시지 목록 조회 (`GET /rooms/:roomId/chats`)
  - 텍스트 메시지 전송 (`POST /rooms/:roomId/chats`)
  - WebSocket 실시간 메시지 수신 (`CHAT_MESSAGE` 이벤트)

### 6-2. 이모지 리액션
- **파일**: `src/pages/chat/RoomChatPage.tsx`, `src/store/chatStore.ts`
- **기능**: 메시지 롱프레스/탭으로 이모지 팔레트 표시, 리액션 추가/집계 표시
- **WebSocket**: `CHAT_REACTION` 이벤트 수신으로 실시간 집계 갱신

---

## 7. 도감 (Collection)

### 7-1. 도감 목록 페이지
- **경로**: `/collection`
- **파일**: `src/pages/collection/CollectionPage.tsx`
- **기능**: 수집률(%), 완료/전체 미션 수, 완료한 미션 카드 목록 (`GET /collections`)

### 7-2. 도감 미션 상세 페이지
- **경로**: `/collection/:missionId`
- **파일**: `src/pages/collection/CollectionDetailPage.tsx`
- **기능**: 미션 제목/설명, 완료 횟수, 기록 목록(방 이름, 날짜, 썸네일, 영상) (`GET /collections/missions/:missionId`)

---

## 8. 알림 (Notifications)

### 8-1. 알림 목록 페이지
- **경로**: `/notifications`
- **파일**: `src/pages/notifications/NotificationsPage.tsx`
- **기능**: 오늘/이번 주 그룹핑 알림 목록 (`GET /notifications`)
- **알림 타입**: `MISSION_START`, `MISSION_COMPLETE`, `SYNKLOG_CREATED`, `MEMBER_JOIN`, `ACHIEVEMENT`

### 8-2. 알림 설정 토글
- **파일**: `src/store/settingsStore.ts`, `src/store/notificationStore.ts`
- **항목**: 미션 알림 / 결과 알림 / 하이라이트 알림
- **저장**: `localStorage` 연동으로 앱 재시작 후에도 유지

---

## 9. 프로필 (Profile)

### 9-1. 프로필 페이지
- **경로**: `/profile`
- **파일**: `src/pages/profile/ProfilePage.tsx`
- **기능**: 프로필 이미지/이름 표시, 알림 설정 토글, 다크모드 토글, 로그아웃, 탈퇴 진입

### 9-2. 프로필 편집 페이지
- **경로**: `/profile/edit`
- **파일**: `src/pages/profile/ProfileEditPage.tsx`
- **기능**: 이름 수정, 프로필 이미지 업로드/변경 (`PATCH /users/me`)

### 9-3. 회원 탈퇴 페이지
- **경로**: `/profile/withdraw`
- **파일**: `src/pages/profile/WithdrawPage.tsx`
- **기능**: 탈퇴 확인 UI, 계정 삭제 API 연동 (`DELETE /users/me`)

---

## 10. 공통 / 레이아웃

### 10-1. 라이트/다크 모드 테마
- **파일**: `src/store/themeStore.ts`, `src/styles/`
- **구현**: CSS 변수(`--color-bg`, `--color-text` 등) 기반 테마 전환
- **저장**: `localStorage`에 테마 설정 유지

### 10-2. 하단 탭 네비게이션
- **파일**: `src/components/layout/BottomNav.tsx`, `src/components/layout/AppLayout.tsx`
- **탭**: 홈(`/`) / 도감(`/collection`) / 방(`/rooms`) / 마이(`/profile`)

### 10-3. 앱 헤더 / NavHeader
- **파일**: `src/components/layout/AppHeader.tsx`, `src/components/layout/NavHeader.tsx`
- `AppHeader`: 로고, 알림 벨 아이콘, 부제목 (탭 레이아웃용)
- `NavHeader`: 뒤로가기 버튼, 페이지 타이틀 (풀스크린 페이지용)

### 10-4. 상태 관리 (Zustand Store)
| 스토어 | 파일 | 관리 상태 |
|--------|------|-----------|
| `authStore` | `src/store/authStore.ts` | 로그인 유저 정보, JWT 토큰 |
| `missionStore` | `src/store/missionStore.ts` | 현재 활성 미션 상태 |
| `chatStore` | `src/store/chatStore.ts` | 방별 채팅 메시지 캐시 |
| `notificationStore` | `src/store/notificationStore.ts` | 알림 목록 |
| `settingsStore` | `src/store/settingsStore.ts` | 알림 ON/OFF 설정 |
| `themeStore` | `src/store/themeStore.ts` | 라이트/다크 테마 |
| `roomStore` | `src/store/roomStore.ts` | 방 목록 및 상세 정보 |

### 10-5. API 클라이언트
- **파일**: `src/services/api/client.ts`, `src/services/api/endpoints.ts`
- `baseURL`: `.env`의 `VITE_API_BASE_URL` 환경변수 사용
- JWT Bearer 토큰 자동 주입 (axios interceptor)

### 10-6. WebSocket 클라이언트
- **파일**: `src/services/websocket/client.ts`, `src/hooks/useWebSocket.ts`
- **이벤트**: `MISSION_FIRED`, `MEMBER_SUBMITTED`, `MISSION_COMPLETED`, `CHAT_MESSAGE`, `CHAT_REACTION`, `MEMBER_JOINED`, `MEMBER_LEFT`

---

## 라우트 맵

```
/onboarding                          → 온보딩
/login                               → 로그인
/invite/:code                        → 초대 링크 (공개)

/ (Protected + AppLayout)
├── /                                → 홈 (활성 미션)
├── /collection                      → 도감 목록
├── /collection/:missionId           → 도감 미션 상세
├── /rooms                           → 방 목록
└── /profile                         → 프로필

/ (Protected, 풀스크린)
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
├── /result/:missionId               → 미션 결과(콜라주)
├── /profile/edit                    → 프로필 편집
└── /profile/withdraw                → 회원 탈퇴
```

---

## GitHub 이슈 목록

| # | 제목 | 상태 |
|---|------|------|
| [#1](https://github.com/Ahyoung00/SYNK_v1/issues/1) | feat: 온보딩 페이지 구현 | ✅ closed |
| [#2](https://github.com/Ahyoung00/SYNK_v1/issues/2) | feat: 카카오 OAuth 팝업 로그인 구현 | ✅ closed |
| [#3](https://github.com/Ahyoung00/SYNK_v1/issues/3) | feat: 구글 OAuth 팝업 로그인 구현 | ✅ closed |
| [#4](https://github.com/Ahyoung00/SYNK_v1/issues/4) | feat: 홈 화면 활성 미션 카드 및 실시간 카운트다운 구현 | ✅ closed |
| [#5](https://github.com/Ahyoung00/SYNK_v1/issues/5) | feat: 다중 미션 발생 시 방 선택 화면 구현 | ✅ closed |
| [#6](https://github.com/Ahyoung00/SYNK_v1/issues/6) | feat: 미션 발생 브라우저 Push 알림 구현 | ✅ closed |
| [#7](https://github.com/Ahyoung00/SYNK_v1/issues/7) | feat: 미션 상세 페이지 구현 | ✅ closed |
| [#8](https://github.com/Ahyoung00/SYNK_v1/issues/8) | feat: 미션 카메라 촬영 및 영상 제출 기능 구현 | ✅ closed |
| [#9](https://github.com/Ahyoung00/SYNK_v1/issues/9) | feat: 미션 제출 후 재촬영 및 내 영상 보기 기능 추가 | ✅ closed |
| [#10](https://github.com/Ahyoung00/SYNK_v1/issues/10) | feat: 미션 대기 화면(실시간 참여 현황) 구현 | ✅ closed |
| [#11](https://github.com/Ahyoung00/SYNK_v1/issues/11) | feat: 미션 처리 중 화면 구현 | ✅ closed |
| [#12](https://github.com/Ahyoung00/SYNK_v1/issues/12) | feat: 미션 결과(콜라주) 화면 구현 | ✅ closed |
| [#13](https://github.com/Ahyoung00/SYNK_v1/issues/13) | feat: 방 목록(참여중/대기중) 페이지 구현 | ✅ closed |
| [#14](https://github.com/Ahyoung00/SYNK_v1/issues/14) | feat: 방 상세 페이지 구현 | ✅ closed |
| [#15](https://github.com/Ahyoung00/SYNK_v1/issues/15) | feat: 방 생성 페이지 구현 | ✅ closed |
| [#16](https://github.com/Ahyoung00/SYNK_v1/issues/16) | feat: 초대 코드로 방 참가 기능 구현 | ✅ closed |
| [#17](https://github.com/Ahyoung00/SYNK_v1/issues/17) | feat: 방 설정(이름/썸네일/미션 시간 수정) 페이지 구현 | ✅ closed |
| [#18](https://github.com/Ahyoung00/SYNK_v1/issues/18) | feat: 방 멤버 관리 페이지 구현 | ✅ closed |
| [#19](https://github.com/Ahyoung00/SYNK_v1/issues/19) | feat: 방 앨범(날짜별 콜라주 목록) 페이지 구현 | ✅ closed |
| [#20](https://github.com/Ahyoung00/SYNK_v1/issues/20) | feat: SynkLog 상세 페이지 구현 | ✅ closed |
| [#21](https://github.com/Ahyoung00/SYNK_v1/issues/21) | feat: SynkLog 생성 버튼 추가 | ✅ closed |
| [#22](https://github.com/Ahyoung00/SYNK_v1/issues/22) | feat: 방 채팅 페이지 구현(WebSocket 실시간 메시지) | ✅ closed |
| [#23](https://github.com/Ahyoung00/SYNK_v1/issues/23) | feat: 채팅 이모지 리액션 기능 구현 | ✅ closed |
| [#24](https://github.com/Ahyoung00/SYNK_v1/issues/24) | feat: 도감 목록 페이지 구현 | ✅ closed |
| [#25](https://github.com/Ahyoung00/SYNK_v1/issues/25) | feat: 도감 미션 상세 페이지 구현 | ✅ closed |
| [#26](https://github.com/Ahyoung00/SYNK_v1/issues/26) | feat: 알림 목록 페이지 구현 | ✅ closed |
| [#27](https://github.com/Ahyoung00/SYNK_v1/issues/27) | feat: 알림 설정 토글 localStorage 연동 구현 | ✅ closed |
| [#28](https://github.com/Ahyoung00/SYNK_v1/issues/28) | feat: 프로필 페이지 구현 | ✅ closed |
| [#29](https://github.com/Ahyoung00/SYNK_v1/issues/29) | feat: 프로필 편집(이름/프로필 이미지 변경) 페이지 구현 | ✅ closed |
| [#30](https://github.com/Ahyoung00/SYNK_v1/issues/30) | feat: 회원 탈퇴 기능 구현 | ✅ closed |
| [#31](https://github.com/Ahyoung00/SYNK_v1/issues/31) | feat: 라이트/다크 모드 테마 토글 구현 | ✅ closed |
| [#32](https://github.com/Ahyoung00/SYNK_v1/issues/32) | feat: 하단 탭 네비게이션(홈/도감/방/마이) 구현 | ✅ closed |
| [#33](https://github.com/Ahyoung00/SYNK_v1/issues/33) | feat: 앱 헤더 및 NavHeader 컴포넌트 구현 | ✅ closed |
| [#34](https://github.com/Ahyoung00/SYNK_v1/issues/34) | fix: 스크롤 처리 개선 | ✅ closed |
| [#35](https://github.com/Ahyoung00/SYNK_v1/issues/35) | fix: 멤버 프로필 이미지 적용 수정 | ✅ closed |
| [#36](https://github.com/Ahyoung00/SYNK_v1/issues/36) | feat: 방 생성/설정 시 프로필 이미지(썸네일) 변경 기능 추가 | ✅ closed |
| [#37](https://github.com/Ahyoung00/SYNK_v1/issues/37) | feat: AuthGuard 및 라우터 인증 보호 구현 | ✅ closed |
| [#38](https://github.com/Ahyoung00/SYNK_v1/issues/38) | feat: 백엔드 연동 baseURL 설정 및 Vite host 고정 | ✅ closed |
