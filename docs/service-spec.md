# SYNK 서비스 전체 기능 명세서

> 버전: v1.0 | 작성일: 2026-06-02  
> "지금 이 순간을 함께" — 예고 없이 울리는 영상 미션으로 친구들과 일상을 기록하는 SNS 앱

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [기술 스택 및 아키텍처](#2-기술-스택-및-아키텍처)
3. [서비스 플로우](#3-서비스-플로우)
4. [화면 와이어프레임](#4-화면-와이어프레임)
5. [기능 상세 명세](#5-기능-상세-명세)
6. [사용자 시나리오](#6-사용자-시나리오)
7. [데이터 흐름](#7-데이터-흐름)
8. [API 연동 정보](#8-api-연동-정보)
9. [WebSocket 이벤트](#9-websocket-이벤트)
10. [상태 관리 (Zustand)](#10-상태-관리-zustand)
11. [예외 처리 및 엣지 케이스](#11-예외-처리-및-엣지-케이스)

---

## 1. 서비스 개요

### 1-1. 서비스 소개

**SYNK**는 친구/가족/소그룹이 하나의 "방"에 모여, 서버가 무작위 시간에 발동하는 **영상 미션**을 함께 수행하며 일상을 기록하는 서비스다.

- 미션은 **예고 없이 발동**되며 **5분의 제한 시간** 안에 3~5초 영상을 촬영해 제출해야 한다.
- 모든 참여자의 영상은 자동으로 **콜라주(Collage)**로 합성된다.
- 하루치 콜라주를 묶어 **SynkLog** 영상으로 생성할 수 있다.
- 미션 완료 기록은 **도감(Collection)**에 수집된다.

### 1-2. 핵심 가치

| 가치 | 설명 |
|------|------|
| 자발성 | 예고 없는 알림으로 '지금 이 순간'을 자연스럽게 포착 |
| 연결감 | 방 멤버 전체가 같은 순간을 함께 남김 |
| 기록 | 날짜별 앨범, SynkLog, 도감으로 추억 아카이브 |
| 재미 | 타이머 긴장감, 콜라주 결과의 즐거움 |

### 1-3. 주요 사용자 플로우 요약

```
회원가입/로그인 → 방 참가 또는 생성
    → 미션 발동 알림 수신 (랜덤)
    → 5분 안에 영상 촬영·제출
    → 콜라주 결과 확인
    → 앨범/SynkLog/도감 기록
```

---

## 2. 기술 스택 및 아키텍처

### 2-1. 프론트엔드

| 항목 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite |
| 라우터 | React Router v6 |
| 상태 관리 | Zustand (persist to localStorage) |
| API 통신 | Fetch API (커스텀 래퍼) |
| 실시간 통신 | WebSocket (자동 재연결, exponential backoff) |
| 카메라 | MediaRecorder API (Web) / Capacitor Camera (Native) |
| 알림 | Web Notification API |
| 스타일 | CSS Modules + CSS 변수 (라이트/다크 테마) |

### 2-2. 백엔드 (연동 기준)

| 항목 | 기술 |
|------|------|
| 서버 | Spring Boot |
| 인증 | JWT Bearer Token |
| OAuth | 카카오 / 구글 (Authorization Code 방식) |
| 파일 저장 | 외부 스토리지 (S3 등) — URL로 관리 |
| WebSocket | STOMP over WebSocket |

### 2-3. 환경 변수

```env
VITE_API_BASE_URL=https://api.synk.app    # REST API 베이스 URL
VITE_WS_BASE_URL=wss://api.synk.app/ws    # WebSocket 베이스 URL
VITE_KAKAO_JS_KEY=<kakao_javascript_key>  # 카카오 앱 JS 키
VITE_GOOGLE_CLIENT_ID=<google_client_id>  # 구글 OAuth 클라이언트 ID
```

### 2-4. 공통 API 응답 형식

```json
{
  "success": true,
  "data": { ... },
  "message": "처리 완료"
}
```

> 오류 시: `success: false`, `data: null`, `message: "에러 사유"`

---

## 3. 서비스 플로우

### 3-1. 전체 화면 전환 맵

```
┌─────────────────────────────────────────────────────────────────────┐
│  [공개 영역]                                                          │
│                                                                     │
│   /onboarding ──────────────────────────────────────┐               │
│                                                     ▼               │
│   /invite/:code ────────────────────────────► /login                │
│                                                     │               │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │ 로그인 성공
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  [보호 영역 — AppLayout (하단 탭)]                                    │
│                                                                     │
│   ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────────┐                   │
│   │  홈  │  │  도감    │  │  방  │  │  마이    │                   │
│   │  /   │  │/collect  │  │/rooms│  │/profile  │                   │
│   └──┬───┘  └────┬─────┘  └──┬───┘  └────┬─────┘                   │
│      │           │           │            │                         │
└──────┼───────────┼───────────┼────────────┼────────────────────────┘
       │           │           │            │
       │       /collection     │        /profile/edit
       │       /:missionId     │        /profile/withdraw
       │                       │
       │              /room/create ─────► /room/:id/created
       │              /room/join
       │              /room/:id ──┬────► /room/:id/album ──► /room/:id/album/:date
       │                          ├────► /room/:id/chat
       │                          └────► /room/:id/settings ──► /settings/members
       │
       │  [미션 플로우 — 홈 카드에서 진입]
       └──► /mission/:roomId
                │
                ▼
         /mission/:roomId/camera
                │
                ▼
         /mission/:roomId/processing
                │
                ▼
         /mission/:roomId/waiting
                │
                ▼
         /result/:missionId
```

### 3-2. 미션 생명주기

```
서버 (랜덤 발동)
    │
    ▼ MISSION_FIRED (WS) + GET /missions/active (폴링 30s)
    │
    ├─ 0개 → 홈: 대기 안내 카드
    ├─ 1개 → 홈: 미션 카드 표시
    └─ 2개+ → 홈: 방 선택 화면 → 선택 후 미션 카드

미션 카드 상태 흐름
    │
    ├─ [참여하기] ──────────────► 카메라 → 촬영 → 제출 → 대기
    ├─ [참여완료] ──────────────► 대기 화면 (다른 멤버 기다림)
    ├─ [미션 완료 보기] (만료) ──► 결과 화면
    └─ [전원 완료] ─────────────► 카드 자동 제거 → 앨범 자동 저장
```

### 3-3. 콜라주/SynkLog 생성 흐름

```
미션 마감 (5분 경과 or 전원 제출)
    │
    ▼ 서버 자동 콜라주 생성 (AI 영상 합성)
    │
    ├─ PROCESSING → 결과화면: "생성 중" 표시 (폴링)
    └─ COMPLETED  → 콜라주 영상 재생 가능

사용자가 SynkLog 생성 버튼 클릭 (하루치 콜라주 묶음)
    │
    ▼ POST /rooms/:id/albums/:date/synklog
    │
    ├─ PROCESSING → SynkLog 상세: 처리 중 표시 (폴링)
    └─ COMPLETED  → SynkLog 영상 재생 가능
```

### 3-4. 인증 플로우

```
사용자: [카카오 로그인 버튼 클릭]
    │
    ▼ 팝업 오픈 (카카오 OAuth 동의 화면)
    │
    ▼ 사용자 동의 → kakao-callback.html 리다이렉트
    │
    ▼ postMessage({ type: 'kakao_oauth', code }) → 부모 창
    │
    ▼ POST /auth/kakao { code, redirectUri }
    │
    ├─ 기존 회원 (isNewUser: false) ──┐
    └─ 신규 회원 (isNewUser: true)  ──┤
                                      ▼
                               JWT 토큰 저장 (localStorage)
                               GET /users/me → 프로필 로드
                                      │
                                      ▼
                                  홈 화면 이동
```

---

## 4. 화면 와이어프레임

> `[ ]` = 버튼, `( )` = 입력 필드, `{ }` = 이미지/미디어

### 4-1. 로그인 화면 `/login`

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│            SYNK                 │
│      지금 이 순간을 함께          │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🟡  카카오 로그인       │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ⚪  Google 계정으로 로그인│   │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### 4-2. 홈 화면 `/` — 대기 상태

```
┌─────────────────────────────────┐
│ SYNK               🔔           │  ← AppHeader
│ 안녕하세요, 아영님 👋             │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │  🔕                       │  │
│  │  아직 아무런 미션이         │  │
│  │  울리지 않았습니다          │  │
│  │  미션이 울리면 홈 화면에    │  │
│  │  바로 알려드릴게요          │  │
│  │                           │  │
│  │  ▸ 랜덤 알림을 기다리는 중  │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  ● 참여 가능한 미션 없음    │  │
│  │  방 탭에서 방을 확인하거나  │  │
│  │  만들어보세요               │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  🏠    📚    🚪    👤           │  ← BottomNav
└─────────────────────────────────┘
```

### 4-3. 홈 화면 `/` — 미션 발동 상태

```
┌─────────────────────────────────┐
│ SYNK               🔔           │
│ 안녕하세요, 아영님 👋             │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ ⚡ 우리집에서 미션이 울렸어요│  │  ← 방 배지
│  │   5분 안에 참여해야 기록돼요 │  │
│  │                           │  │
│  │      ⏱ 04:23             │  │  ← 카운트다운 (파랑)
│  │                           │  │
│  │   오늘의 미션              │  │
│  │   "지금 하고 있는 것 찍기"  │  │
│  │                           │  │
│  │   참여 현황   3/5          │  │
│  │   [아영✓] [유현⏺] [지민⏳] │  │
│  │   [수현✓] [대주⏳]         │  │
│  │                           │  │
│  │   [ 참여하기 →            ]│  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  🏠    📚    🚪    👤           │
└─────────────────────────────────┘
```

### 4-4. 카메라 촬영 화면 `/mission/:roomId/camera`

```
┌─────────────────────────────────┐
│ ←  미션 촬영          ⏱ 03:41  │  ← NavHeader + 미션 잔여시간
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │      { 카메라 프리뷰 }      │  │  ← 셀피 기본
│  │                           │  │
│  │                           │  │
│  │                    🔄     │  │  ← 전/후면 전환
│  └───────────────────────────┘  │
│                                 │
│         녹화 중: 3s / 5s        │  ← 진행 바
│                                 │
│  ┌─────────┐       ┌─────────┐  │
│  │  재촬영  │       │  제출   │  │
│  └─────────┘       └─────────┘  │
│  (canStop 충족 시 제출 활성화)    │
│                                 │
└─────────────────────────────────┘
```

### 4-5. 미션 대기 화면 `/mission/:roomId/waiting`

```
┌─────────────────────────────────┐
│ ←  미션 대기                    │
├─────────────────────────────────┤
│                                 │
│     다른 멤버를 기다리는 중...    │
│           ⏱ 02:55              │
│                                 │
│  ┌───────────────────────────┐  │
│  │ {아영}  아영    ✅ 완료    │  │
│  │ {유현}  유현    ⏺ 찍는중  │  │
│  │ {지민}  지민    ⏳ 대기    │  │
│  │ {수현}  수현    ✅ 완료    │  │
│  │ {대주}  대주    ⏳ 대기    │  │
│  └───────────────────────────┘  │
│                                 │
│   [ 내 영상 다시 보기 ]           │
│   [ 재촬영하기 ]                  │
│                                 │
└─────────────────────────────────┘
```

### 4-6. 방 목록 화면 `/rooms`

```
┌─────────────────────────────────┐
│ SYNK               🔔           │
│                                 │
├─────────────────────────────────┤
│                                 │
│  참여중인 방                     │
│  ┌───────────────────────────┐  │
│  │ {썸네일} 우리집            │  │
│  │         오늘 미션 3/5 완료 │  │
│  │         [아영] [유현] [지민]│  │
│  └───────────────────────────┘  │
│                                 │
│  대기중인 방                     │
│  ┌───────────────────────────┐  │
│  │ {썸네일} 친구들            │  │
│  │         2/6명 · 대기 중   │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────┐  ┌─────────────┐ │
│  │  + 방 만들기│  │ 코드로 참가 │ │
│  └───────────┘  └─────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠    📚    🚪    👤           │
└─────────────────────────────────┘
```

### 4-7. 방 상세 화면 `/room/:roomId`

```
┌─────────────────────────────────┐
│ ← 우리집              ⚙️        │
├─────────────────────────────────┤
│                                 │
│  { 방 커버 이미지 }              │
│                                 │
│  멤버 (4/6)                     │
│  [아영] [유현] [지민] [수현] +   │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  [ 💬 채팅 ]                    │
│  [ 📷 앨범 ]                    │
│  [ 🔗 초대 링크 복사 ]           │
│                                 │
│  최근 앨범                      │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │{썸네일│ │{썸네일│ │{썸네일│   │
│  │ 6.01}│ │ 5.31}│ │ 5.30}│   │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
└─────────────────────────────────┘
```

### 4-8. 앨범 상세 (SynkLog) `/room/:roomId/album/:date`

```
┌─────────────────────────────────┐
│ ← 2026.06.01 앨범               │
├─────────────────────────────────┤
│                                 │
│  SynkLog                        │
│  ┌───────────────────────────┐  │
│  │     { SynkLog 영상 }       │  │
│  │          ▶                │  │
│  └───────────────────────────┘  │
│  포함 미션: 지금 하는 것 찍기 외 2│
│                                 │
│  ─────────────────────────────  │
│                                 │
│  미션 1. 지금 하는 것 찍기       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │{아영}│ │{유현}│ │{지민}│ │{수현}│  │
│  │ ✅ │ │ ✅ │ │ ✅ │ │ ❌ │   │
│  └────┘ └────┘ └────┘ └────┘   │
│                                 │
│  [ + SynkLog 생성 ]              │
│                                 │
└─────────────────────────────────┘
```

### 4-9. 채팅 화면 `/room/:roomId/chat`

```
┌─────────────────────────────────┐
│ ← 우리집 (4명)      ✅오늘미션완료│
├─────────────────────────────────┤
│                                 │
│  [2026.06.01]                   │
│                                 │
│  {아영} 아영                    │
│       오늘 미션 다들 했어?  10:03│
│                    ❤️ 2          │
│                                 │
│                      [나 했어!   │
│              유현 10:04]        │
│                    👍 1          │
│                                 │
│  {지민} 지민                    │
│       나도~                     │
│                                 │
├─────────────────────────────────┤
│ (  메시지를 입력하세요...      ) [ ▶] │
└─────────────────────────────────┘
```

### 4-10. 도감 화면 `/collection`

```
┌─────────────────────────────────┐
│ SYNK               🔔           │
│                                 │
├─────────────────────────────────┤
│                                 │
│  내 도감                        │
│  수집률 ▓▓▓▓▓░░░░░  23/90 (26%)│
│                                 │
│  ┌───────────────────────────┐  │
│  │ {썸네일} 지금 하는 것 찍기  │  │
│  │          완료 5회 · 5.31  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ {썸네일} 창밖 풍경 찍기     │  │
│  │          완료 3회 · 5.28  │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  🏠    📚    🚪    👤           │
└─────────────────────────────────┘
```

### 4-11. 알림 화면 `/notifications`

```
┌─────────────────────────────────┐
│ ← 알림                          │
├─────────────────────────────────┤
│                                 │
│  오늘                           │
│  ┌───────────────────────────┐  │
│  │ ⚡ 우리집에서 미션이 시작됐어요│ │
│  │    지금 하는 것 찍기 · 방금  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🎬 SynkLog 영상이 완성됐어요│  │
│  │    2026.06.01 · 오전 11:00│  │
│  └───────────────────────────┘  │
│                                 │
│  이번 주                        │
│  ┌───────────────────────────┐  │
│  │ 👋 유현님이 우리집에 들어왔어요│ │
│  │    2일 전                  │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### 4-12. 프로필 화면 `/profile`

```
┌─────────────────────────────────┐
│ SYNK               🔔           │
│                                 │
├─────────────────────────────────┤
│                                 │
│        {프로필 이미지}            │
│          아영                   │
│       [ 프로필 편집 ]             │
│                                 │
│  ─────────────────────────────  │
│  미션 알림           [   ON  ]   │
│  결과 알림           [  OFF  ]   │
│  하이라이트 알림      [   ON  ]   │
│  ─────────────────────────────  │
│  다크 모드           [   ON  ]   │
│  ─────────────────────────────  │
│  [ 로그아웃 ]                    │
│  [ 회원 탈퇴 ]                   │
│                                 │
├─────────────────────────────────┤
│  🏠    📚    🚪    👤           │
└─────────────────────────────────┘
```

---

## 5. 기능 상세 명세

### 5-1. 인증 (Auth)

#### 카카오/구글 OAuth 로그인

| 항목 | 내용 |
|------|------|
| 방식 | Authorization Code + postMessage 팝업 |
| 팝업 크기 | width=450, height=600 |
| callback 파일 | `public/kakao-callback.html`, `public/google-callback.html` |
| 토큰 저장 | `localStorage['synk_auth_token']` (Zustand persist) |
| 자동 로그인 | 앱 재기동 시 localStorage에서 토큰 복원 |
| 세션 만료 처리 | HTTP 401 수신 시 토큰 삭제 → `/login` 리다이렉트 |

#### AuthGuard

- `isAuthenticated` 상태 기준으로 보호 라우트 접근 제어
- 공개 라우트: `/onboarding`, `/login`, `/invite/:code`
- 로그인 후 원래 가려던 경로로 복귀 (미구현 — 현재는 홈으로 이동)

---

### 5-2. 홈 / 미션 발동

#### 활성 미션 폴링

| 항목 | 내용 |
|------|------|
| 주기 | 30초 |
| API | `GET /missions/active` |
| 결과 0개 | 대기 안내 카드 표시 |
| 결과 1개 | 인라인 미션 카드 즉시 표시 |
| 결과 2개+ | 방 선택 리스트 → 선택 후 해당 카드 |

#### 미션 카드 상태 전환

```
초기 ──► 참여 전 (참여하기 버튼)
           │
           ├── [참여하기] ──► 카메라 페이지
           │
           ├── 제출 완료 ──► [✓ 참여완료 / 대기 화면 보기]
           │
           ├── 타이머 만료 ──► [미션 완료 보기 →] (결과 페이지)
           │
           └── 전원 완료 ──► 카드 자동 제거 + "🎉 모두 완료!" 메시지
```

#### Push 알림 조건

- 미션 알림 설정 ON (`settingsStore.missionAlert`)
- 첫 로드 이후 폴링에서 새 `missionId` 감지 시
- `Notification.permission` === `'granted'` 필요 (최초 권한 요청 포함)

---

### 5-3. 미션 플로우

#### 카메라 촬영

| 항목 | 내용 |
|------|------|
| 최소 녹화 시간 | 3초 (`VIDEO_MIN_S`) |
| 최대 녹화 시간 | 5초 (`VIDEO_MAX_S`, 자동 종료) |
| 코덱 | `video/webm;codecs=vp9` (미지원 시 `video/webm`) |
| 카메라 방향 | 전면 기본, 전/후면 전환 가능 |
| 네이티브 | Capacitor Camera (iOS/Android) |

#### 제출 흐름

1. 영상 녹화 완료 → `Blob` 생성
2. 외부 스토리지(S3) 업로드 → `videoUrl` 획득
3. `POST /submissions { missionId, videoUrl, roomId }` 전송
4. 성공 → `/mission/:roomId/waiting` 이동

#### 대기 화면

- `GET /submissions/missions/:missionId` 폴링으로 참여 현황 갱신
- WebSocket `MEMBER_SUBMITTED` 이벤트로 실시간 상태 갱신
- 재촬영 / 내 영상 보기 버튼 제공 (제출 후에도 가능)

---

### 5-4. 방 (Room)

#### 방 생성 설정 항목

| 항목 | 범위 | 비고 |
|------|------|------|
| 방 이름 | 필수 | 최대 20자 (추정) |
| 썸네일 | 선택 | 이미지 업로드 |
| 최대 인원 | 1~10명 | `ROOM_MAX_MEMBERS = 10` |
| 일일 미션 수 | 1~5회 | `dailyMissionCount` |
| 미션 시작 시간 | HH:mm | 미션 발동 가능 시작 |
| 미션 종료 시간 | HH:mm | 미션 발동 종료 |

#### 방 참가 방식

1. **코드 직접 입력**: `/room/join` → 6자리 코드 입력
2. **초대 링크**: `/invite/:code` → 자동으로 참가 처리

#### 방 역할

| 역할 | 권한 |
|------|------|
| 방장 (owner) | 방 설정 수정, 멤버 강퇴, 방 삭제 |
| 일반 멤버 | 미션 참여, 채팅, 앨범 조회, 방 나가기 |

---

### 5-5. 앨범 / SynkLog

#### 앨범 구조

```
방 앨범 목록 (날짜별)
  └─ 특정 날짜 상세
       ├─ 미션 1: 콜라주 영상 + 참여자 영상 목록
       ├─ 미션 2: 콜라주 영상 + 참여자 영상 목록
       └─ SynkLog: 전체 미션 묶음 영상 (수동 생성)
```

#### SynkLog 생성 조건

- 해당 날짜에 완료된 미션이 1개 이상
- 이미 SynkLog가 존재하면 재생성 여부 확인 (현재 중복 요청 시 서버 처리에 위임)
- PROCESSING 상태 → 폴링으로 완료 확인

---

### 5-6. 채팅

| 항목 | 내용 |
|------|------|
| 메시지 타입 | TEXT (현재 구현), IMAGE/EMOJI (타입 정의만) |
| 실시간 수신 | WebSocket `CHAT_MESSAGE` 이벤트 |
| 메시지 캐시 | `chatStore`에 방별 저장 (탭 전환 시 유지) |
| 리액션 | 이모지 롱프레스 → 팔레트 → `POST /chats/:id/reactions` |
| 오늘 미션 완료 배지 | `todayMissionCompleted` 필드 기반 |

---

### 5-7. 도감 (Collection)

- 총 미션 템플릿: **90종** (`COLLECTION_TOTAL`)
- 수집률 = 완료한 고유 미션 수 / 90 × 100%
- 미션 상세: 같은 미션을 여러 방에서 완료한 기록 전부 표시

---

### 5-8. 알림 설정

| 알림 종류 | 설정 키 | 기본값 |
|----------|---------|------|
| 미션 알림 | `missionNotification` | ON |
| 결과 알림 | `resultNotification` | ON |
| 하이라이트 알림 | `highlightNotification` | ON |

- 저장: `localStorage` + `PATCH /users/me/notifications` 백엔드 동기화
- 미션 알림 OFF → 브라우저 Push 알림 발송 안 함

---

## 6. 사용자 시나리오

### 시나리오 1: 신규 가입 후 방 개설

```
1. 앱 첫 진입 → /onboarding (서비스 소개)
2. [시작하기] → /login
3. [카카오 로그인] → 팝업 동의 → JWT 발급
4. 홈: 대기 카드 ("미션이 울리면 알려드릴게요")
5. /rooms → [방 만들기]
6. 방 이름 "우리집", 인원 5명, 미션 10:00~22:00, 일일 3회 설정
7. [생성] → /room/:id/created → 초대 코드 확인
8. 친구에게 초대 링크 공유
```

### 시나리오 2: 미션 수행 (핵심 플로우)

```
1. 홈 폴링 (30초) 또는 WS MISSION_FIRED → 미션 카드 등장
2. 브라우저 알림: "⚡ 우리집에서 미션이 울렸어요! - 지금 하는 것 찍기"
3. [참여하기] → /mission/:roomId/camera
4. 전면 카메라 프리뷰 시작
5. [녹화] → 3~5초 촬영 → [제출]
6. S3 업로드 → POST /submissions
7. /mission/:roomId/waiting → 다른 멤버 대기
8. 전원 제출 or 5분 만료 → /result/:missionId
9. 콜라주 영상 재생 (COMPLETED) or 생성 중 표시 (PROCESSING)
```

### 시나리오 3: 앨범 → SynkLog 생성

```
1. /room/:roomId → [앨범]
2. /room/:roomId/album → 날짜 목록 확인
3. 오늘 날짜 탭 → /room/:roomId/album/2026-06-01
4. 미션별 콜라주 영상 및 참여자 영상 확인
5. [+ SynkLog 생성] → POST /rooms/:id/albums/2026-06-01/synklog
6. "생성 중..." → 폴링 → COMPLETED
7. SynkLog 영상 재생
```

### 시나리오 4: 초대 링크로 방 참가

```
1. 친구에게 받은 링크: https://synk.app/invite/ABC123 클릭
2. /invite/ABC123 → 비로그인 → /login으로 이동 (로그인 필요)
3. 로그인 완료 → /invite/ABC123 재진입
4. POST /rooms/join { code: "ABC123" }
5. 방 입장 성공 → /room/:roomId
```

### 시나리오 5: 다중 방 미션 동시 발동

```
1. '우리집'과 '친구들' 방에서 동시에 미션 발동
2. 홈: 방 선택 화면 (두 카드, 각각 타이머 표시)
3. '우리집' 선택 → 인라인 미션 카드 표시
4. [← 다른 방 선택] → 방 선택 화면으로 복귀
5. 원하는 방 선택 후 참여
```

---

## 7. 데이터 흐름

### 7-1. 미션 제출 데이터 흐름

```
[클라이언트]                    [서버]                   [외부]

useCamera hook
  └─ MediaRecorder → Blob
       │
       ▼
S3 업로드 (api.upload)  ──────────────────────────► S3 스토리지
                                                       │
                                                    videoUrl 반환
       │ ◄────────────────────────────────────────────┘
       ▼
POST /submissions
{ missionId, videoUrl, roomId }  ──────────────► DB 저장 (submissions)
                                                       │
                                                 콜라주 생성 트리거
                                                       │
                                    ◄──── WS MISSION_COMPLETED (전원 제출 or 만료)
                                    ◄──── WS MEMBER_SUBMITTED (개별 제출)
```

### 7-2. 실시간 채팅 데이터 흐름

```
[클라이언트 A]                  [서버]              [클라이언트 B]

POST /rooms/:id/chats ─────────► DB 저장
{ content }                        │
                                   ▼
                           WS 브로드캐스트
                                   │
◄── WS CHAT_MESSAGE ───────────────┘──────────────── WS CHAT_MESSAGE ──►
    chatStore 저장                                    chatStore 저장
    UI 렌더링                                         UI 렌더링
```

### 7-3. 인증 토큰 관리

```
로그인 성공
  └─ JWT 토큰 → localStorage['synk_auth_token'] (Zustand persist)
                     │
          ┌──────────┴──────────────┐
          ▼                         ▼
  API 요청마다                  앱 재시작 시
  Authorization: Bearer {token}   자동 복원
          │
          ▼
  401 응답 → 토큰 삭제 → /login 리다이렉트
```

### 7-4. 테마/설정 데이터 흐름

```
사용자: 다크모드 ON 클릭
  └─ themeStore.toggle()
       └─ localStorage 저장
           └─ document.documentElement에 CSS 변수 적용
                └─ 모든 컴포넌트 자동 반영 (var(--color-bg) 등)

사용자: 미션 알림 OFF 클릭
  └─ settingsStore 업데이트 (localStorage)
       └─ PATCH /users/me/notifications { missionNotification: false }
            └─ 이후 폴링에서 새 미션 감지해도 Push 알림 발송 안 함
```

---

## 8. API 연동 정보

### 8-1. 공통 규칙

| 항목 | 규칙 |
|------|------|
| Base URL | `VITE_API_BASE_URL` 환경변수 |
| 인증 헤더 | `Authorization: Bearer {JWT}` |
| 요청 형식 | `Content-Type: application/json` |
| 응답 형식 | `{ success, data, message }` |
| 필드 케이스 | 요청/응답 모두 camelCase |

### 8-2. API 목록

#### Auth

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| POST | `/auth/kakao` | 카카오 로그인 | `{ code, redirectUri }` | `LoginResponse` |
| POST | `/auth/google` | 구글 로그인 | `{ code, redirectUri }` | `LoginResponse` |
| POST | `/auth/logout` | 로그아웃 | — | — |
| POST | `/auth/dev-login` | 개발용 로그인 | `{ userId }` | `{ token, userId, name, profileImage }` |

#### User

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/users/me` | 내 프로필 조회 | — | `User` |
| PATCH | `/users/me` | 프로필 수정 | `{ name?, profileImage? }` | — |
| PATCH | `/users/me/notifications` | 알림 설정 수정 | `{ missionNotification?, resultNotification?, highlightNotification? }` | — |
| DELETE | `/users/me` | 회원 탈퇴 | — | — |

#### Room

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/rooms/my` | 내 방 목록 | — | `RoomsMyResponse` |
| GET | `/rooms/:roomId` | 방 상세 | — | `RoomDetail` |
| POST | `/rooms` | 방 생성 | `{ name, maxMembers, dailyMissionCount, missionStartTime, missionEndTime }` | `RoomCreatedResponse` |
| PATCH | `/rooms/:roomId` | 방 설정 수정 | `RoomUpdateRequest` | — |
| POST | `/rooms/join` | 방 참가 | `{ code }` | `RoomJoinedResponse` |
| DELETE | `/rooms/:roomId/leave` | 방 나가기 | — | — |
| DELETE | `/rooms/:roomId` | 방 삭제 (방장) | — | — |
| GET | `/rooms/:roomId/invite` | 초대 정보 | — | `{ roomId, roomName, code, inviteUrl, thumbnail }` |
| GET | `/rooms/:roomId/members` | 멤버 목록 | — | `RoomMember[]` |
| DELETE | `/rooms/:roomId/members/:userId` | 멤버 강퇴 | — | — |

#### Mission

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/missions/active` | 활성 미션 조회 | — | `ActiveMissionItem[]` |
| POST | `/submissions` | 영상 제출 | `{ missionId, videoUrl, roomId }` | `SubmissionCreatedResponse` |
| GET | `/submissions/missions/:missionId` | 제출 현황 | — | `MissionParticipantsResponse` |

#### Album / SynkLog

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/rooms/:roomId/albums` | 앨범 목록 | — | `AlbumItem[]` |
| GET | `/rooms/:roomId/albums/:date/collages` | 날짜별 콜라주 | — | `CollageItem[]` |
| GET | `/rooms/:roomId/albums/:date/synklog` | SynkLog 조회 | — | `SynklogDetailResponse` |
| POST | `/rooms/:roomId/albums/:date/synklog` | SynkLog 생성 | — | `SynklogCreatedResponse` |

#### Chat

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/rooms/:roomId/chats` | 채팅 목록 | — | `RoomChatListResponse` |
| POST | `/rooms/:roomId/chats` | 메시지 전송 | `{ content }` | `ChatSentResponse` |
| POST | `/rooms/:roomId/chats/:messageId/reactions` | 리액션 추가 | `{ emoji }` | — |

#### Collection

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/collections` | 도감 목록 | — | `CollectionListResponse` |
| GET | `/collections/missions/:missionId` | 미션 상세 | — | `CollectionDetailResponse` |

#### Notifications

| Method | Path | 설명 | 요청 Body | 응답 Data |
|--------|------|------|-----------|-----------|
| GET | `/notifications` | 알림 목록 | — | `NotificationsResponse` |
| PATCH | `/notifications/:id/read` | 읽음 처리 | — | — |
| PATCH | `/notifications/read-all` | 전체 읽음 | — | — |

---

## 9. WebSocket 이벤트

### 9-1. 연결 방식

```
WebSocket URL: {WS_BASE_URL}/rooms/{roomId}?token={JWT}
```

- 방 상세 페이지 / 채팅 페이지 진입 시 `wsClient.connect(roomId)` 호출
- 페이지 이탈 시 `wsClient.disconnect()` 호출
- 연결 끊김 시 자동 재연결 (지수 백오프: 1s → 2s → 4s → ... → 최대 30s)

### 9-2. 이벤트 타입

```ts
type WsEventType =
  | 'MISSION_FIRED'      // 새 미션 발동
  | 'MEMBER_SUBMITTED'   // 멤버 영상 제출
  | 'MISSION_COMPLETED'  // 미션 마감 (전원 완료 or 시간 만료)
  | 'CHAT_MESSAGE'       // 새 채팅 메시지
  | 'CHAT_REACTION'      // 채팅 리액션 추가
  | 'MEMBER_JOINED'      // 멤버 방 입장
  | 'MEMBER_LEFT'        // 멤버 방 퇴장
```

### 9-3. 공통 페이로드 형식

```json
{
  "type": "CHAT_MESSAGE",
  "room_id": 42,
  "payload": { ... }
}
```

### 9-4. 이벤트별 처리

| 이벤트 | 처리 |
|--------|------|
| `MISSION_FIRED` | `missionStore.setActive()` → 홈 카드 표시 |
| `MEMBER_SUBMITTED` | 대기 화면 참여 현황 갱신 |
| `MISSION_COMPLETED` | 결과 페이지 이동 or 카드 상태 변경 |
| `CHAT_MESSAGE` | `chatStore` 메시지 추가 → UI 갱신 |
| `CHAT_REACTION` | 해당 메시지 리액션 집계 갱신 |
| `MEMBER_JOINED` | 방 멤버 수 갱신 |
| `MEMBER_LEFT` | 방 멤버 목록에서 제거 |

---

## 10. 상태 관리 (Zustand)

### 10-1. 스토어 구조

```
authStore       — 인증 (user, token, isAuthenticated)
missionStore    — 현재 활성 미션 상태 (ActiveMissionState)
chatStore       — 방별 채팅 메시지 캐시 (Map<roomId, messages[]>)
roomStore       — 방 목록 및 상세 정보 캐시
notificationStore — 알림 목록
settingsStore   — 알림 ON/OFF 설정 (missionAlert, resultAlert, highlightAlert)
themeStore      — 다크/라이트 테마
```

### 10-2. 영속화 (persist) 스토어

| 스토어 | localStorage 키 | 영속화 필드 |
|--------|----------------|------------|
| `authStore` | `synk_auth_token` | user, token, refreshToken, isAuthenticated |
| `settingsStore` | `synk_settings` | 알림 설정, 테마 |
| `themeStore` | `synk_theme` | 테마 값 |

### 10-3. 비영속화 스토어

`missionStore`, `chatStore`, `roomStore`, `notificationStore`는 앱 재시작 시 초기화 → 필요 시 API 재호출

---

## 11. 예외 처리 및 엣지 케이스

### 11-1. 인증 예외

| 상황 | 처리 |
|------|------|
| 카카오 팝업 차단됨 | 에러 메시지: "팝업이 차단됐어요" + 재시도 안내 |
| 카카오 팝업 직접 닫음 | `popup.closed` 감지 → 로딩 상태 해제 |
| OAuth code 만료 | `POST /auth/kakao` 실패 → "로그인에 실패했어요. 다시 시도해주세요." |
| JWT 만료 (401) | 토큰 삭제 + `/login` 자동 리다이렉트 |
| 환경변수 미설정 | `VITE_KAKAO_JS_KEY` 없으면 "카카오 앱 키가 설정되지 않았어요" 경고 |

### 11-2. 미션 예외

| 상황 | 처리 |
|------|------|
| 미션 발동 중 앱 새로고침 | 폴링으로 재감지 (firstLoad 이후 알림 재발송 방지) |
| 타이머 만료 후 카드 유지 | `expiredIdsRef`로 서버 삭제 후에도 "미션 완료 보기" 버튼 유지 |
| 전원 완료 → 카드 즉시 제거 | `allDone` 감지 → `onAllDone()` 콜백 → 카드 unmount |
| 다중 미션 선택 중 만료 | 로컬 타이머 카운트다운 + 색상 변경으로 긴박감 표현 |
| 네트워크 오류 시 제출 | 재시도 UI (현재 에러 메시지 표시 수준, 재시도 버튼 추가 필요) |

### 11-3. 카메라 예외

| 상황 | 처리 |
|------|------|
| 카메라 권한 거부 | `state = 'error'`, `error` 메시지 표시: "Camera unavailable" |
| 3초 미만 녹화 시 제출 시도 | `canStop = false` → 제출 버튼 비활성화 |
| 5초 초과 | `setTimeout`으로 자동 녹화 종료 |
| MediaRecorder 미지원 브라우저 | `vp9` 미지원 시 `video/webm` 폴백 |
| 네이티브 앱 촬영 실패 | Capacitor Camera 예외 catch → `state = 'error'` |

### 11-4. 방 관련 예외

| 상황 | 처리 |
|------|------|
| 잘못된 초대 코드 | `POST /rooms/join` 실패 → "유효하지 않은 코드예요" 에러 메시지 |
| 이미 참여 중인 방 코드 입력 | 서버 409 에러 → "이미 참여 중인 방이에요" |
| 최대 인원 초과 | 서버 400 에러 → "방이 꽉 찼어요" |
| 방장 방 나가기 | 방장 전용 경고 (방 삭제 or 방장 위임 필요 — 현재 서버 정책에 위임) |
| 방 삭제 후 접근 | 404 → 방 목록으로 이동 |

### 11-5. WebSocket 예외

| 상황 | 처리 |
|------|------|
| 연결 실패 | `onerror` 핸들러 → 재연결 시도 (지수 백오프) |
| 메시지 파싱 실패 | `JSON.parse` 예외 catch → 무시 + 경고 로그 |
| 연결 끊김 | `onclose` → `shouldReconnect` 플래그 확인 후 자동 재연결 |
| 방 퇴장 후 WS 수신 | `disconnect()` 호출로 핸들러 모두 제거 |

### 11-6. 앨범 / SynkLog 예외

| 상황 | 처리 |
|------|------|
| SynkLog 없음 (404) | "아직 SynkLog가 없어요" + [생성하기] 버튼 표시 |
| SynkLog PROCESSING | 폴링으로 완료 대기, "생성 중..." 스피너 |
| 콜라주 PROCESSING | "콜라주를 만들고 있어요..." 표시 |
| 앨범 썸네일 없음 (null) | 기본 플레이스홀더 이미지 표시 |

### 11-7. API 공통 예외

| HTTP 상태 | 처리 |
|-----------|------|
| 401 | 토큰 삭제 → `/login` 리다이렉트 |
| 400 | `ApiError` 메시지를 UI에 표시 |
| 404 | 해당 리소스 없음 안내 |
| 500+ | "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." |
| 네트워크 끊김 | `fetch` 예외 → 사용자에게 연결 오류 안내 |

### 11-8. 알림 예외

| 상황 | 처리 |
|------|------|
| 브라우저 알림 권한 거부 | Push 알림 미발송, 인앱 카드만 표시 |
| 알림 API 미지원 브라우저 | `'Notification' in window` 체크 후 조용히 건너뜀 |

---

## 부록

### A. 타이머 색상 기준

| 남은 시간 | 색상 | CSS 변수 |
|-----------|------|----------|
| > 180초 (3분+) | 파랑 | `--color-timer-safe` |
| 60~180초 | 초록 | `--color-timer-warn` |
| < 60초 (1분 미만) | 빨강 | `--color-timer-danger` |

### B. 미션 상수

| 상수 | 값 | 설명 |
|------|----|------|
| `MISSION_DURATION_S` | 300 | 미션 제한 시간 (5분) |
| `VIDEO_MIN_S` | 3 | 최소 녹화 시간 (초) |
| `VIDEO_MAX_S` | 5 | 최대 녹화 시간 (초) |
| `ROOM_MAX_MEMBERS` | 10 | 방 최대 인원 |
| `COLLECTION_TOTAL` | 90 | 전체 미션 템플릿 수 |

### C. localStorage 저장 키

| 키 | 내용 |
|----|------|
| `synk_auth_token` | 인증 상태 (user, token, isAuthenticated) |
| `synk_refresh_token` | 리프레시 토큰 (현재 미사용) |
| `synk_user` | 유저 정보 (예비) |
| `synk_onboarding_done` | 온보딩 완료 여부 |

### D. 관련 GitHub 이슈

전체 이슈 목록: https://github.com/Ahyoung00/SYNK_v1/issues?state=closed

| 카테고리 | 이슈 번호 |
|----------|----------|
| Auth | #1 ~ #3, #37 |
| 홈/미션 | #4 ~ #12 |
| 방 | #13 ~ #18, #36 |
| 앨범/SynkLog | #19 ~ #21 |
| 채팅 | #22 ~ #23 |
| 도감 | #24 ~ #25 |
| 알림 | #26 ~ #27 |
| 프로필 | #28 ~ #30 |
| 공통/레이아웃 | #31 ~ #35, #38 |
