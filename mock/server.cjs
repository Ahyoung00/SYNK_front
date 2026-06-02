/**
 * SYNK Mock API Server
 * API 명세서 기준으로 구현된 json-server 커스텀 서버
 *
 * 응답 형식: { data: T, status: number, message: string }
 * 현재 로그인 유저: users.id = 1 (아영)
 *
 * 실행: node mock/server.cjs
 * URL:  http://localhost:3001
 */

const jsonServer = require('json-server')
const path = require('path')

const app = jsonServer.create()
const dbPath = path.join(__dirname, 'db.json')
const router = jsonServer.router(dbPath)

app.use(jsonServer.defaults({ logger: false }))
app.use(jsonServer.bodyParser)

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
const db = () => router.db

// 토큰에서 getMeId(req) 동적 파싱 — 형식: "mock-token-userId-{id}"
// 일반 요청마다 호출되므로 함수로 유지
function getMeId(req) {
  const auth = req.headers['authorization'] ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const match = token.match(/mock-token-userId-(\d+)/)
  return match ? Number(match[1]) : 1   // 파싱 실패 시 기본값 1
}

// ── 미션 세션 타이머 & 스케줄러 상수 ─────────────────────────────────────────
const MISSION_WINDOW_MS       = 300_000  // 미션 제출 창: 5분
const SCHEDULER_INTERVAL_MS   = 30_000   // 스케줄러 체크 주기: 30초
const MOCK_AUTO_SUBMIT_MIN_MS = 60_000   // 다른 멤버 자동 제출 최소 딜레이: 1분
const MOCK_AUTO_SUBMIT_MAX_MS = 240_000  // 다른 멤버 자동 제출 최대 딜레이: 4분
// mock 환경에서 영상 URL로 사용할 공용 테스트 영상 (실제 영상 업로드 불가 시 대체)
const MOCK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

// "HH:MM" → 분 단위 정수 (예: "07:30" → 450)
function getTimeMinutes(timeStr) {
  const [h, m] = String(timeStr ?? '00:00').split(':').map(Number)
  return h * 60 + m
}

// mission의 targeted_at(Date) 및 deadline(Date) 계산 — time_slot + date 기반
// debug 미션(_debug_deadline 보유)은 fallback 처리
function getMissionTimes(mission) {
  if (mission._debug_deadline) {
    const deadline    = new Date(mission._debug_deadline)
    const targeted_at = new Date(deadline.getTime() - MISSION_WINDOW_MS)
    return { targeted_at, deadline }
  }
  const slot = db().get('mission_time_slots').find({ id: mission.time_slot_id }).value()
  if (!slot || !mission.date) return null
  const targeted_at = new Date(`${mission.date}T${slot.slot_time}:00`)
  const deadline    = new Date(targeted_at.getTime() + MISSION_WINDOW_MS)
  return { targeted_at, deadline }
}

// ── 미션 종료 처리 (COMPLETED | EXPIRED) + 도감 자동 생성 ──────────────────────
function closeMission(missionId, newStatus = 'COMPLETED') {
  const mission = db().get('missions').find({ id: missionId }).value()
  if (!mission || mission.status !== 'ACTIVE') return

  db().get('missions').find({ id: missionId }).assign({ status: newStatus }).write()

  // COMPLETED일 때만 도감 기록 생성
  if (newStatus !== 'COMPLETED') {
    console.log(`  ⏱️  미션 EXPIRED  방[${mission.room_id}] missionId=${missionId}`)
    return
  }

  // 제출한 멤버별 collection_records 생성 (user_id 중복 제거)
  const allSubs   = db().get('submissions').filter({ mission_id: missionId, status: 'SUBMITTED' }).value()
  const seenUsers = new Set()
  const date      = mission.date ?? new Date().toISOString().slice(0, 10)
  for (const sub of allSubs) {
    if (seenUsers.has(sub.user_id)) continue
    seenUsers.add(sub.user_id)

    const exists = db().get('collection_records')
      .find({ user_id: sub.user_id, mission_template_id: mission.mission_template_id, date })
      .value()
    if (exists) continue

    const maxId = db().get('collection_records').maxBy('id').value()?.id ?? 0
    db().get('collection_records').push({
      id:                  maxId + 1,
      user_id:             sub.user_id,
      mission_template_id: mission.mission_template_id,
      room_id:             mission.room_id,
      submission_id:       sub.id,
      date,
      thumbnail:           null,
    }).write()
  }

  console.log(`  📚 미션 COMPLETED + 도감 기록 생성  방[${mission.room_id}] missionId=${missionId}  제출자=${allSubs.length}명`)
}

// ── 서버 시작 시 기존 COMPLETED 미션 → collection_records backfill ────────────
function initializeCollectionRecords() {
  const closedMissions = db().get('missions').filter({ status: 'COMPLETED' }).value()
  let created = 0

  for (const m of closedMissions) {
    // 중복 제거: 각 user_id당 첫 번째 submission만 사용
    const allSubs = db().get('submissions').filter({ mission_id: m.id, status: 'SUBMITTED' }).value()
    const seenUsers = new Set()
    const uniqueSubs = allSubs.filter((s) => {
      if (seenUsers.has(s.user_id)) return false
      seenUsers.add(s.user_id)
      return true
    })

    const date = m.date ?? new Date().toISOString().slice(0, 10)
    for (const sub of uniqueSubs) {
      const exists = db().get('collection_records')
        .find({ user_id: sub.user_id, mission_template_id: m.mission_template_id, date })
        .value()
      if (exists) continue

      const maxId = db().get('collection_records').maxBy('id').value()?.id ?? 0
      db().get('collection_records').push({
        id:                  maxId + 1,
        user_id:             sub.user_id,
        mission_template_id: m.mission_template_id,
        room_id:             m.room_id,
        submission_id:       sub.id,
        date,
        thumbnail:           null,
      }).write()
      created++
    }
  }

  if (created > 0) {
    console.log(`  📚 도감 backfill: ${created}건 생성`)
  }
}

// ── 미션 발동 알림 생성 (방 멤버 전원) ───────────────────────────────────────
function createMissionNotifications(missionId, roomId, missionTitle) {
  const memberIds = db().get('room_members').filter({ room_id: roomId }).map('user_id').value()

  // 방 이름 + 발동 시각 조합
  const room    = db().get('rooms').find({ id: roomId }).value()
  const mission = db().get('missions').find({ id: missionId }).value()
  const times   = mission ? getMissionTimes(mission) : null
  const timeStr = times
    ? times.targeted_at.toTimeString().slice(0, 5)   // "HH:MM"
    : new Date().toTimeString().slice(0, 5)
  const content = `${missionTitle} · ${room?.name ?? ''} · ${timeStr}`

  const now = new Date().toISOString()
  for (const userId of memberIds) {
    const maxId = db().get('notifications').maxBy('id').value()?.id ?? 0
    db().get('notifications').push({
      id:         maxId + 1,
      user_id:    userId,
      type:       'MISSION_START',
      title:      '미션이 울렸어요! ⚡',
      content,
      related_id: missionId,
      is_read:    false,
      created_at: now,
    }).write()
  }
}

// ── mock: 미션 발동 후 다른 멤버 자동 제출 (혼자 테스트용) ────────────────────
function scheduleAutoSubmits(missionId, roomId, memberIds) {
  const shuffled = [...memberIds].sort(() => Math.random() - 0.5)
  shuffled.forEach((userId, i) => {
    const delay = MOCK_AUTO_SUBMIT_MIN_MS + Math.random() * (MOCK_AUTO_SUBMIT_MAX_MS - MOCK_AUTO_SUBMIT_MIN_MS)
    setTimeout(() => {
      // 이미 제출했으면 skip
      const already = db().get('submissions')
        .find({ mission_id: missionId, user_id: userId }).value()
      if (already) return

      // 미션이 아직 ACTIVE인지 확인
      const m = db().get('missions').find({ id: missionId }).value()
      if (!m || m.status !== 'ACTIVE') return

      const maxSubId = db().get('submissions').maxBy('id').value()?.id ?? 0
      db().get('submissions').push({
        id:           maxSubId + 1,
        user_id:      userId,
        room_id:      roomId,
        mission_id:   missionId,
        status:       'SUBMITTED',
        video_url:    MOCK_VIDEO_URL,
        submitted_at: new Date().toISOString(),
      }).write()

      // 전원 제출 완료 체크
      const memberCount     = db().get('room_members').filter({ room_id: roomId }).size().value()
      const submittedCount  = db().get('submissions').filter({ mission_id: missionId, status: 'SUBMITTED' }).size().value()
      if (submittedCount >= memberCount) {
        closeMission(missionId)
      }
    }, delay)
  })
}

// 실제 API 응답 형식: { success, data, message }
const ok   = (res, data, message = 'success') =>
  res.json({ success: true, data, message })

const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, message })

// DB(snake_case) → API 응답(camelCase) 변환
const pickUser = (userId) => {
  const u = db().get('users').find({ id: userId }).value()
  if (!u) return null
  return { userId: u.id, name: u.name, profileImage: u.profile_image ?? null }
}

// =============================================================================
// 인증 (Auth)
// POST /auth/kakao    — 카카오 로그인
// POST /auth/google   — Google 로그인
// POST /auth/logout   — 로그아웃
// =============================================================================

// 실제 응답 형식: { token, isNewUser, userId, name, profileImage }
app.post('/auth/kakao', (req, res) => {
  const user = db().get('users').find({ id: 1 }).value()
  ok(res, {
    token: 'mock-token-userId-1',
    isNewUser: false,
    userId: user.id,
    name: user.name,
    profileImage: user.profile_image,
  }, '로그인 성공')
})

app.post('/auth/google', (req, res) => {
  const user = db().get('users').find({ id: 1 }).value()
  ok(res, {
    token: 'mock-token-userId-1',
    isNewUser: false,
    userId: user.id,
    name: user.name,
    profileImage: user.profile_image,
  }, '로그인 성공')
})

// DEV 전용 — 유저 선택 로그인
app.post('/auth/dev-login', (req, res) => {
  const { userId } = req.body
  const user = db().get('users').find({ id: Number(userId) }).value()
  if (!user) return fail(res, 404, '유저 없음')
  ok(res, {
    token:        `mock-token-userId-${user.id}`,
    isNewUser:    false,
    userId:       user.id,
    name:         user.name,
    profileImage: user.profile_image,
  }, '개발용 로그인 성공')
})

app.post('/auth/logout', (req, res) => ok(res, null))

// =============================================================================
// 유저 (User)
// GET    /users/me                — 내 프로필 조회
// PATCH  /users/me                — 프로필 수정
// PATCH  /users/me/notifications  — 알림 설정 수정
// DELETE /users/me                — 회원 탈퇴
// =============================================================================

// GET /users/me — 프로필 조회 (camelCase 응답)
app.get('/users/me', (req, res) => {
  const u = db().get('users').find({ id: getMeId(req) }).value()
  ok(res, {
    userId:                u.id,
    name:                  u.name,
    profileImage:          u.profile_image ?? null,
    missionNotification:   u.mission_alert  ?? true,
    resultNotification:    u.result_alert   ?? true,
    highlightNotification: u.highlight_alert ?? true,
  }, '프로필 조회 성공')
})

// 순서 중요: /me/notifications 가 /me 보다 먼저
// PATCH /users/me/notifications — 알림 설정 수정 (camelCase body, data 없음)
// Request: { missionNotification?, resultNotification?, highlightNotification? }
app.patch('/users/me/notifications', (req, res) => {
  const { missionNotification, resultNotification, highlightNotification } = req.body
  const patch = {}
  if (missionNotification   !== undefined) patch.mission_alert   = missionNotification
  if (resultNotification    !== undefined) patch.result_alert    = resultNotification
  if (highlightNotification !== undefined) patch.highlight_alert = highlightNotification
  db().get('users').find({ id: getMeId(req) }).assign(patch).write()
  ok(res, null, '알림 설정 변경 완료')
})

// PATCH /users/me — 프로필 수정 (camelCase body, data 없음)
// Request: { name?, profileImage? }
app.patch('/users/me', (req, res) => {
  const { name, profileImage } = req.body
  const patch = {}
  if (name         !== undefined) patch.name          = name
  if (profileImage !== undefined) patch.profile_image = profileImage
  db().get('users').find({ id: getMeId(req) }).assign(patch).write()
  ok(res, null, '프로필 수정 완료')
})

// DELETE /users/me — 회원 탈퇴 (data 없음)
app.delete('/users/me', (req, res) => ok(res, null, '회원 탈퇴 완료'))

// =============================================================================
// 방 (Room)
// GET    /rooms/my               — 내 방 목록 (참여중/대기중 구분)
// POST   /rooms                  — 방 생성
// POST   /rooms/join             — 초대 코드로 방 참여
// GET    /rooms/{roomId}         — 방 상세 조회
// PATCH  /rooms/{roomId}         — 방 설정 수정
// GET    /rooms/{roomId}/invite  — 초대 정보 조회
// DELETE /rooms/{roomId}/leave   — 방 나가기
// =============================================================================

// 내 방 목록 — API 명세서 기준: { active[], waiting[] }
// active: 인원이 다 찬 방 (totalMissions, completedMissions, isAllCompleted, memberProfiles)
// waiting: 인원 미달 방 (currentMembers, maxMembers, waitingCount, memberProfiles)
app.get('/rooms/my', (req, res) => {
  const meId = getMeId(req)
  const memberRoomIds = db().get('room_members')
    .filter({ user_id: meId })
    .map('room_id')
    .value()

  const rooms = db().get('rooms')
    .filter((r) => memberRoomIds.includes(r.id))
    .value()

  const todayStr = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const active  = []
  const waiting = []

  for (const room of rooms) {
    const memberCount = db().get('room_members').filter({ room_id: room.id }).size().value()
    const memberProfiles = db().get('room_members').filter({ room_id: room.id }).value()
      .map((m) => {
        const u = db().get('users').find({ id: m.user_id }).value()
        return { userId: m.user_id, profileImage: u?.profile_image ?? null }
      })

    if (memberCount < room.max_members) {
      // 대기중 — 인원 미달
      waiting.push({
        id:             room.id,
        name:           room.name,
        currentMembers: memberCount,
        maxMembers:     room.max_members,
        waitingCount:   room.max_members - memberCount,
        roomThumbnail:  room.thumbnail ?? null,
        memberProfiles,
      })
    } else {
      // 참여중 — 인원 충족
      const todayMissions = db().get('missions')
        .filter((m) => m.room_id === room.id && m.date === todayStr)
        .value()
      const completedMissions = todayMissions.filter((m) => m.status === 'COMPLETED').length
      const totalMissions     = room.daily_mission_count ?? 1

      active.push({
        id:                 room.id,
        name:               room.name,
        totalMissions,
        completedMissions,
        isAllCompleted:     completedMissions >= totalMissions,
        roomThumbnail:      room.thumbnail ?? null,
        memberProfiles,
      })
    }
  }

  ok(res, { active, waiting })
})

// 방 생성 — Request camelCase, Response: { roomId, code, name, createdAt, thumbnail }
app.post('/rooms', (req, res) => {
  // camelCase로 받음 (maxMembers, dailyMissionCount, missionStartTime, missionEndTime)
  const {
    name,
    maxMembers,
    dailyMissionCount,
    missionStartTime = '10:00',
    missionEndTime   = '22:00',
  } = req.body

  const maxId      = db().get('rooms').maxBy('id').value()?.id ?? 0
  const code       = Math.random().toString(36).substring(2, 7).toUpperCase()
  const createdAt  = new Date().toISOString()

  // DB 내부는 snake_case 유지 (기존 구조와 호환)
  const room = {
    id: maxId + 1,
    name,
    code,
    thumbnail: null,
    owner_id: getMeId(req),
    max_members: maxMembers ?? 5,
    daily_mission_count: dailyMissionCount ?? 1,
    mission_start_time: missionStartTime,
    mission_end_time: missionEndTime,
    created_at: createdAt,
  }
  db().get('rooms').push(room).write()

  const maxMemberId = db().get('room_members').maxBy('id').value()?.id ?? 0
  db().get('room_members').push({
    id: maxMemberId + 1,
    user_id: getMeId(req),
    room_id: room.id,
    is_owner: true,
    joined_at: createdAt,
  }).write()

  // 실제 API 응답 형식
  ok(res, {
    roomId:    room.id,
    code:      room.code,
    name:      room.name,
    createdAt: room.created_at,
    thumbnail: room.thumbnail,
  }, '방 생성 완료')
})

// 초대 코드로 방 참여
app.post('/rooms/join', (req, res) => {
  const { code } = req.body
  if (!code) return fail(res, 400, '코드를 입력해주세요')

  const normalizedCode = String(code).trim().toUpperCase()

  // 네이티브 Array.find 사용 (lowdb 체인 함수 프레디케이트 의존 제거)
  const allRooms = db().get('rooms').value()
  const room = allRooms.find((r) => String(r.code).trim().toUpperCase() === normalizedCode)
  if (!room) return fail(res, 404, '초대 코드가 올바르지 않아요')

  const meId = getMeId(req)
  const allMembers = db().get('room_members').value()
  const alreadyMember = allMembers.find((m) => m.user_id === meId && m.room_id === room.id)

  if (!alreadyMember) {
    const maxId = db().get('room_members').maxBy('id').value()?.id ?? 0
    db().get('room_members').push({
      id: maxId + 1,
      user_id: meId,
      room_id: room.id,
      is_owner: false,
      joined_at: new Date().toISOString(),
    }).write()
  }

  // 최신 상태의 방 정보
  const updated = db().get('rooms').find({ id: room.id }).value()
  const memberCount = db().get('room_members').filter({ room_id: room.id }).size().value()

  // 실제 API 응답 형식: { roomId, roomName, currentMembers, maxMembers }
  ok(res, {
    roomId:         updated.id,
    roomName:       updated.name,
    currentMembers: memberCount,
    maxMembers:     updated.max_members,
  }, '방 참가 완료')
})

// 방 상세 조회 — API 명세서 기준 camelCase + members[] + recentAlbums[]
// Response: { id, name, code, thumbnail, ownerId, currentMembers, maxMembers,
//             dailyMissionCount, missionStartTime, missionEndTime, members[], recentAlbums[] }
app.get('/rooms/:id', (req, res) => {
  const room = db().get('rooms').find({ id: Number(req.params.id) }).value()
  if (!room) return fail(res, 404, '방을 찾을 수 없어요')

  const memberCount = db().get('room_members').filter({ room_id: room.id }).size().value()
  const members = db().get('room_members').filter({ room_id: room.id }).value()
    .map((m) => {
      const u = db().get('users').find({ id: m.user_id }).value()
      return { userId: m.user_id, name: u?.name ?? '', profileImage: u?.profile_image ?? null }
    })

  // 최근 앨범 (COMPLETED 미션 날짜별, 최대 4개)
  const closedDates = [...new Set(
    db().get('missions')
      .filter((m) => m.room_id === room.id && m.status === 'COMPLETED')
      .sortBy('date').reverse().map('date').value(),
  )].slice(0, 4)
  const recentAlbums = closedDates.map((date) => ({
    date:      date.replace(/-/g, '.'),
    thumbnail: null,
  }))

  ok(res, {
    id:                 room.id,
    name:               room.name,
    code:               room.code,
    thumbnail:          room.thumbnail ?? null,
    ownerId:            room.owner_id,
    currentMembers:     memberCount,
    maxMembers:         room.max_members,
    dailyMissionCount:  room.daily_mission_count,
    missionStartTime:   room.mission_start_time,
    missionEndTime:     room.mission_end_time,
    members,
    recentAlbums,
  })
})

// 방 설정 수정 — camelCase body → snake_case DB
// Request: { name, thumbnail, dailyMissionCount, missionStartTime, missionEndTime } (모두 optional)
// Response: data 없음 — { success, message: "방 설정 수정 완료" }
app.patch('/rooms/:id', (req, res) => {
  const id = Number(req.params.id)
  const room = db().get('rooms').find({ id }).value()
  if (!room) return fail(res, 404, '방을 찾을 수 없어요')

  const { name, thumbnail, dailyMissionCount, missionStartTime, missionEndTime } = req.body
  const patch = {}
  if (name               !== undefined) patch.name                = name
  if (thumbnail          !== undefined) patch.thumbnail           = thumbnail
  if (dailyMissionCount  !== undefined) patch.daily_mission_count = dailyMissionCount
  if (missionStartTime   !== undefined) patch.mission_start_time  = missionStartTime
  if (missionEndTime     !== undefined) patch.mission_end_time    = missionEndTime

  db().get('rooms').find({ id }).assign(patch).write()
  ok(res, null, '방 설정 수정 완료')
})

// 방 삭제 (방장 전용 — 스펙에는 없으나 UI에서 사용)
app.delete('/rooms/:id', (req, res) => {
  const roomId = Number(req.params.id)
  // 연관 데이터 cascade 삭제
  const missionIds = db().get('missions').filter({ room_id: roomId }).map('id').value()
  db().get('submissions').remove((s) => missionIds.includes(s.mission_id)).write()
  db().get('missions').remove({ room_id: roomId }).write()
  db().get('synklogs').remove({ room_id: roomId }).write()
  db().get('room_chats').remove({ room_id: roomId }).write()
  db().get('room_members').remove({ room_id: roomId }).write()
  db().get('rooms').remove({ id: roomId }).write()
  ok(res, null, '방 삭제 완료')
})

// 초대 정보 조회 — API 명세서 기준
// Response: { roomId, roomName, code, inviteUrl, thumbnail }
app.get('/rooms/:id/invite', (req, res) => {
  const room = db().get('rooms').find({ id: Number(req.params.id) }).value()
  if (!room) return fail(res, 404, '방을 찾을 수 없어요')
  ok(res, {
    roomId:    room.id,
    roomName:  room.name,
    code:      room.code,
    inviteUrl: `synk.app/r/${room.code}`,
    thumbnail: room.thumbnail ?? null,
  }, '초대 정보 조회 성공')
})

// 방 나가기
app.delete('/rooms/:id/leave', (req, res) => {
  const roomId = Number(req.params.id)
  db().get('room_members').remove({ user_id: getMeId(req), room_id: roomId }).write()
  ok(res, null)
})

// =============================================================================
// 멤버 관리 (스펙 미확정 — UI에서 사용 중)
// GET    /rooms/{roomId}/members
// DELETE /rooms/{roomId}/members/{userId}  — 강퇴
// =============================================================================

app.get('/rooms/:id/members', (req, res) => {
  const roomId = Number(req.params.id)
  const members = db().get('room_members').filter({ room_id: roomId }).value()
  ok(res, members.map((m) => ({ ...m, user: pickUser(m.user_id) })))
})

app.delete('/rooms/:id/members/:userId', (req, res) => {
  db().get('room_members')
    .remove({ user_id: Number(req.params.userId), room_id: Number(req.params.id) })
    .write()
  ok(res, null)
})

// =============================================================================
// 미션 (Mission)
// GET /missions/active?roomId={roomId}
//   - roomId 없음: 내 모든 방의 진행 중인 미션 목록
//   - roomId 있음: 특정 방의 진행 중인 미션 (단일)
// =============================================================================

// 진행 중인 미션 조회 — GET /missions/active
// 항상 ActiveMissionItem[] 반환 (내 모든 방의 active 미션)
// data.length: 0=대기, 1=미션상세, >1=방선택
app.get('/missions/active', (req, res) => {
  const myRoomIds = db().get('room_members')
    .filter({ user_id: getMeId(req) }).map('room_id').value()

  // ACTIVE 상태 미션 전체 (deadline 필터 제거 — 세션 타이머로 대체)
  const allActive = db().get('missions')
    .filter((m) => myRoomIds.includes(m.room_id) && m.status === 'ACTIVE')
    .value()

  // deadline 기준으로 아직 유효한 미션만 포함
  const now = Date.now()
  const missions = allActive.filter((m) => {
    const times = getMissionTimes(m)
    return times && now < times.deadline.getTime()
  })

  const toStatusKo = (sub) => {
    if (!sub) return '대기'
    if (sub.status === 'SUBMITTED') return '완료'
    return '대기'
  }

  const items = missions.map((m) => {
    const tmpl    = db().get('mission_templates').find({ id: m.mission_template_id }).value()
    const room    = db().get('rooms').find({ id: m.room_id }).value()
    const members = db().get('room_members').filter({ room_id: m.room_id }).value()
    const subs    = db().get('submissions').filter({ mission_id: m.id }).value()

    // deadline 기준 남은 시간 (time_slot + date 계산)
    const times = getMissionTimes(m)
    const remainingSeconds = times
      ? Math.max(0, Math.floor((times.deadline.getTime() - Date.now()) / 1000))
      : 0
    const submittedCount   = subs.filter((s) => s.status === 'SUBMITTED').length

    const participants = members.map((mbr) => {
      const u   = db().get('users').find({ id: mbr.user_id }).value()
      const sub = subs.find((s) => s.user_id === mbr.user_id)
      return {
        userId:       u?.id ?? mbr.user_id,
        name:         u?.name ?? '',
        profileImage: u?.profile_image ?? null,
        status:       toStatusKo(sub),
      }
    })

    const slot = db().get('mission_time_slots').find({ id: m.time_slot_id }).value()

    return {
      id:               m.id,
      roomId:           m.room_id,
      roomName:         room?.name ?? '',
      roomThumbnail:    room?.thumbnail ?? null,
      title:            tmpl?.title ?? '',
      description:      tmpl?.description ?? '',
      missionDate:      m.date ?? null,
      slotTime:         slot?.slot_time ?? null,
      deadline:         getMissionTimes(m)?.deadline.toISOString() ?? null,
      remainingSeconds,
      totalMembers:     members.length,
      submittedCount,
      participants,
    }
  })

  ok(res, items, '진행 중인 미션 조회 성공')
})

// =============================================================================
// 미션 참여 현황 (실시간 폴링용)
// GET /missions/{missionId}/participants
// Response: { missionId, title, missionDate, slotTime, deadline, remainingSeconds,
//             status, totalMembers, submittedCount, participants[] }
// =============================================================================

app.get('/missions/:missionId/participants', (req, res) => {
  const missionId = Number(req.params.missionId)
  const mission   = db().get('missions').find({ id: missionId }).value()
  if (!mission) return fail(res, 404, '미션을 찾을 수 없어요')

  const tmpl    = db().get('mission_templates').find({ id: mission.mission_template_id }).value()
  const mTimes  = getMissionTimes(mission)
  const slot    = db().get('mission_time_slots').find({ id: mission.time_slot_id }).value()

  const remainingSeconds = mTimes
    ? Math.max(0, Math.floor((mTimes.deadline.getTime() - Date.now()) / 1000))
    : 0

  const members     = db().get('room_members').filter({ room_id: mission.room_id }).value()
  const submissions = db().get('submissions').filter({ mission_id: missionId }).value()

  const participants = members.map((m) => {
    const u   = db().get('users').find({ id: m.user_id }).value()
    const sub = submissions.find((s) => s.user_id === m.user_id)
    return {
      userId:       m.user_id,
      name:         u?.name ?? '',
      profileImage: u?.profile_image ?? null,
      status:       sub?.status ?? 'PENDING',
      submittedAt:  sub?.submitted_at ?? null,
    }
  })

  ok(res, {
    missionId,
    title:            tmpl?.title ?? '',
    missionDate:      mission.date,
    slotTime:         slot?.slot_time ?? null,
    deadline:         mTimes?.deadline.toISOString() ?? null,
    remainingSeconds,
    status:           mission.status,
    totalMembers:     members.length,
    submittedCount:   submissions.filter((s) => s.status === 'SUBMITTED').length,
    participants,
  }, '참여 현황 조회 성공')
})

// =============================================================================
// 일일 미션 사전 예약 (PENDING 생성)
// 오늘과 내일 날짜에 대해 방별로 daily_mission_count만큼 슬롯 선택 → PENDING INSERT
// =============================================================================
function scheduleDailyMissions() {
  const templates = db().get('mission_templates').value()
  if (templates.length === 0) return

  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const target   = new Date()
    target.setDate(target.getDate() + dayOffset)
    const dateStr  = target.toISOString().slice(0, 10)

    for (const room of db().get('rooms').value()) {
      // 정원이 다 찬 방만 미션 예약
      const memberCount = db().get('room_members').filter({ room_id: room.id }).size().value()
      if (memberCount < room.max_members) continue

      // 이미 예약/진행된 미션 수 확인
      const existing = db().get('missions').filter({ room_id: room.id, date: dateStr }).value()
      if (existing.length >= (room.daily_mission_count ?? 1)) continue

      // 방의 시간 창에 해당하는 슬롯 목록
      const startMin = getTimeMinutes(room.mission_start_time)
      const endMin   = getTimeMinutes(room.mission_end_time)
      const usedSlotIds = existing.map((m) => m.time_slot_id)

      const available = db().get('mission_time_slots')
        .filter((s) => {
          const slotMin = getTimeMinutes(s.slot_time)
          return slotMin >= startMin && slotMin < endMin && !usedSlotIds.includes(s.id)
        })
        .value()
        .sort(() => Math.random() - 0.5) // 셔플

      const needed = (room.daily_mission_count ?? 1) - existing.length
      const selected = []
      for (const slot of available) {
        // 이미 선택된 슬롯과 1시간(2슬롯) 이상 간격 유지
        const slotMin = getTimeMinutes(slot.slot_time)
        const tooClose = selected.some((s) => Math.abs(getTimeMinutes(s.slot_time) - slotMin) < 120)
        if (!tooClose) selected.push(slot)
        if (selected.length >= needed) break
      }

      for (const slot of selected) {
        const tmpl  = templates[Math.floor(Math.random() * templates.length)]
        const maxId = db().get('missions').maxBy('id').value()?.id ?? 0
        db().get('missions').push({
          id:                  maxId + 1,
          room_id:             room.id,
          mission_template_id: tmpl.id,
          time_slot_id:        slot.id,
          date:                dateStr,
          status:              'PENDING',
        }).write()
        console.log(`  📅 미션 예약  방[${room.id}] "${room.name}"  ${dateStr} ${slot.slot_time}  "${tmpl.title}"`)
      }
    }
  }
}

// =============================================================================
// 미션 자동 스케줄러 (서버 내부)
// =============================================================================
// 30초마다 실행:
//   1) ACTIVE 미션 종료 체크 (deadline 만료 → EXPIRED, 전원 제출 → COMPLETED)
//   2) PENDING 미션 활성화 (slot_time 도달 → ACTIVE)
//   3) 일일 미션 사전 예약 (scheduleDailyMissions)
// =============================================================================
function scheduleMissions() {
  const nowMs  = Date.now()

  // ── 1. ACTIVE 미션 종료 체크 ────────────────────────────────────────────
  const activeMissions = db().get('missions').filter({ status: 'ACTIVE' }).value()
  for (const m of activeMissions) {
    const times = getMissionTimes(m)
    if (!times) continue

    // 1-a. deadline 만료 → EXPIRED
    if (nowMs >= times.deadline.getTime()) {
      const memberCount    = db().get('room_members').filter({ room_id: m.room_id }).size().value()
      const submittedCount = db().get('submissions').filter({ mission_id: m.id, status: 'SUBMITTED' }).size().value()
      const newStatus      = submittedCount > 0 ? 'COMPLETED' : 'EXPIRED'
      closeMission(m.id, newStatus)
      continue
    }

    // 1-b. 전원 제출 완료 → 즉시 COMPLETED
    const memberCount    = db().get('room_members').filter({ room_id: m.room_id }).size().value()
    const submittedCount = db().get('submissions').filter({ mission_id: m.id, status: 'SUBMITTED' }).size().value()
    if (memberCount > 0 && submittedCount >= memberCount) {
      closeMission(m.id, 'COMPLETED')
    }
  }

  // ── 2. PENDING 미션 활성화 (slot_time 도달) ──────────────────────────────
  const pendingMissions = db().get('missions').filter({ status: 'PENDING' }).value()
  for (const m of pendingMissions) {
    const times = getMissionTimes(m)
    if (!times) continue
    if (nowMs < times.targeted_at.getTime()) continue  // 아직 시간 안 됨

    // 정원 미달 방은 발동 안 함
    const roomForMission = db().get('rooms').find({ id: m.room_id }).value()
    const memberCountForMission = db().get('room_members').filter({ room_id: m.room_id }).size().value()
    if (!roomForMission || memberCountForMission < roomForMission.max_members) continue

    db().get('missions').find({ id: m.id }).assign({ status: 'ACTIVE' }).write()
    const room = db().get('rooms').find({ id: m.room_id }).value()
    const tmpl = db().get('mission_templates').find({ id: m.mission_template_id }).value()

    createMissionNotifications(m.id, m.room_id, tmpl?.title ?? '')
    const memberIds = db().get('room_members').filter({ room_id: m.room_id }).map('user_id').value()
    scheduleAutoSubmits(m.id, m.room_id, memberIds)

    console.log(`  🎯 미션 활성화!  방[${m.room_id}] "${room?.name}"  ${m.date} ${times.targeted_at.toTimeString().slice(0, 5)}  "${tmpl?.title}"`)
  }

  // ── 3. 일일 미션 사전 예약 ───────────────────────────────────────────────
  scheduleDailyMissions()
}

// =============================================================================
// 디버그: 즉시 미션 강제 발동 (테스트용)
// POST /debug/rooms/:id/trigger-mission
// =============================================================================
app.post('/debug/rooms/:id/trigger-mission', (req, res) => {
  const roomId = Number(req.params.id)
  const room   = db().get('rooms').find({ id: roomId }).value()
  if (!room) return fail(res, 404, '방을 찾을 수 없어요')

  const templates = db().get('mission_templates').value()
  const tmpl      = templates[Math.floor(Math.random() * templates.length)]
  const todayStr  = new Date().toISOString().slice(0, 10)

  // 현재 시각으로부터 5분짜리 임시 슬롯 없이, 즉시 ACTIVE 미션 생성
  // (debug 전용 — time_slot_id=null 허용, getMissionTimes fallback 처리)
  const nowMs    = Date.now()
  const maxId    = db().get('missions').maxBy('id').value()?.id ?? 0
  const newMission = {
    id:                  maxId + 1,
    room_id:             roomId,
    mission_template_id: tmpl.id,
    time_slot_id:        null,  // debug: slot 없이 직접 deadline 저장
    date:                todayStr,
    status:              'ACTIVE',
    _debug_deadline:     new Date(nowMs + MISSION_WINDOW_MS).toISOString(),
  }
  db().get('missions').push(newMission).write()
  createMissionNotifications(newMission.id, roomId, tmpl.title)

  const memberIds = db().get('room_members').filter({ room_id: roomId }).map('user_id').value()
  scheduleAutoSubmits(newMission.id, roomId, memberIds)

  console.log(`  🎯 [DEBUG] 강제 발동!  방[${roomId}] "${room.name}"  →  "${tmpl.title}"`)
  ok(res, { missionId: newMission.id, title: tmpl.title }, '미션 강제 발동!')
})

// =============================================================================
// 제출 (Submission)
// POST /submissions                        — 미션 영상 제출
// POST /submissions/missions/{missionId}   — 미션 제출 현황 조회
// GET  /submissions/{submissionId}         — 개별 영상 조회
// =============================================================================

// 순서 중요: /missions/:id 가 /:id 보다 먼저
// 미션 제출 현황 조회
// GET /submissions/missions/{missionId}
// Response: { remainingSeconds, participants: [{ name, profileImage, status }] }
app.get('/submissions/missions/:missionId', (req, res) => {
  const missionId = Number(req.params.missionId)
  const mission   = db().get('missions').find({ id: missionId }).value()
  if (!mission) return fail(res, 404, '미션을 찾을 수 없어요')

  // 남은 시간(초) — time_slot 기반 deadline 계산
  const mTimes       = getMissionTimes(mission)
  const remainingSeconds = mTimes
    ? Math.max(0, Math.floor((mTimes.deadline.getTime() - Date.now()) / 1000))
    : 0

  // 방 멤버 전체
  const members     = db().get('room_members').filter({ room_id: mission.room_id }).value()
  // 이 미션의 제출물
  const submissions = db().get('submissions').filter({ mission_id: missionId }).value()

  const participants = members.map((m) => {
    const user = db().get('users').find({ id: m.user_id }).value()
    const sub  = submissions.find((s) => s.user_id === m.user_id)
    return {
      name:         user?.name          ?? '',
      profileImage: user?.profile_image ?? null,
      status:       sub?.status === 'SUBMITTED' ? '완료' : '미완료',
    }
  })

  ok(res, { remainingSeconds, participants }, '참여 현황 조회 성공')
})

// 미션 영상 제출
// Request (camelCase JSON): { missionId, videoUrl, roomId }
// Response: { id, submittedAt }
app.post('/submissions', (req, res) => {
  const { missionId, videoUrl, roomId } = req.body
  if (!missionId) return fail(res, 400, 'missionId는 필수입니다')

  const submittedAt = new Date().toISOString()

  // 중복 제출 방지: 이미 제출한 경우 기존 submission 반환
  const myId = getMeId(req)
  const existing = db().get('submissions')
    .find({ mission_id: missionId, user_id: myId }).value()
  if (existing) {
    return ok(res, { id: existing.id, submittedAt: existing.submitted_at }, '이미 제출됨')
  }

  const maxId = db().get('submissions').maxBy('id').value()?.id ?? 0
  const sub = {
    id: maxId + 1,
    user_id: myId,
    room_id: roomId ?? 1,
    mission_id: missionId,
    status: 'SUBMITTED',
    // blob URL은 세션 만료 후 재생 불가 → mock 영상 URL로 대체
    video_url: (videoUrl && !videoUrl.startsWith('blob:')) ? videoUrl : MOCK_VIDEO_URL,
    submitted_at: submittedAt,
  }
  db().get('submissions').push(sub).write()

  // ── 전원 제출 체크 → 미션 즉시 COMPLETED + 도감 기록 ──────────────────
  const mission = db().get('missions').find({ id: missionId }).value()
  if (mission && mission.status === 'ACTIVE') {
    const memberCount    = db().get('room_members').filter({ room_id: mission.room_id }).size().value()
    const submittedCount = db().get('submissions').filter({ mission_id: missionId, status: 'SUBMITTED' }).size().value()
    if (submittedCount >= memberCount) {
      closeMission(missionId, 'COMPLETED')
    }
  }

  ok(res, {
    id:          sub.id,
    submittedAt: sub.submitted_at,
  }, '제출 완료')
})

// GET /submissions/:id — 개별 영상 조회 (camelCase 변환)
// API.md: { id, userId, userName, profileImage, missionTitle, submittedAt, videoUrl }
app.get('/submissions/:id', (req, res) => {
  const sub = db().get('submissions').find({ id: Number(req.params.id) }).value()
  if (!sub) return fail(res, 404, '제출물 없음')
  const u    = db().get('users').find({ id: sub.user_id }).value()
  const tmpl = db().get('missions').find({ id: sub.mission_id }).value()
  const title = tmpl
    ? (db().get('mission_templates').find({ id: tmpl.mission_template_id }).value()?.title ?? '')
    : ''
  ok(res, {
    id:           sub.id,
    userId:       sub.user_id,
    userName:     u?.name ?? '',
    profileImage: u?.profile_image ?? null,
    missionTitle: title,
    submittedAt:  sub.submitted_at,
    videoUrl:     sub.video_url ?? null,
  }, '영상 조회 성공')
})

// =============================================================================
// 앨범 / SynkLog
// GET  /rooms/{roomId}/albums                       — 날짜별 앨범 목록
// GET  /rooms/{roomId}/albums/{date}/collages        — 특정 날짜 SYNKLOG(콜라주)
// POST /rooms/{roomId}/albums/{date}/synklog         — SYNKLOG 생성 요청
// =============================================================================

// 방의 날짜별 앨범 목록 — COMPLETED 미션 기반 (synklogs 불필요)
// Response: { date("YYYY.MM.DD"), thumbnail, memberProfiles[] }[]
app.get('/rooms/:id/albums', (req, res) => {
  const roomId = Number(req.params.id)

  // COMPLETED 미션을 날짜별로 그룹핑
  const closedMissions = db().get('missions')
    .filter((m) => m.room_id === roomId && m.status === 'COMPLETED')
    .value()

  // date → mission[] 맵
  const byDate = {}
  for (const m of closedMissions) {
    const date = m.date   // "YYYY-MM-DD"
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  }

  // 날짜 내림차순
  const dates = Object.keys(byDate).sort().reverse()

  const data = dates.map((date) => {
    const dayMissions = byDate[date]

    // 제출자 userId 집합 (중복 제거)
    const submittedUserIds = new Set()
    for (const m of dayMissions) {
      db().get('submissions')
        .filter({ mission_id: m.id, status: 'SUBMITTED' }).value()
        .forEach((s) => submittedUserIds.add(s.user_id))
    }

    const memberProfiles = Array.from(submittedUserIds).map((uid) => {
      const u = db().get('users').find({ id: uid }).value()
      return { userId: uid, profileImage: u?.profile_image ?? null }
    })

    return {
      date:          date.replace(/-/g, '.'),   // "YYYY-MM-DD" → "YYYY.MM.DD"
      thumbnail:     null,
      memberProfiles,
    }
  })

  ok(res, data, '앨범 목록 조회 성공')
})

// =============================================================================
// GET /rooms/:id/albums/:date/collages — 날짜별 미션 콜라주 + 참여자 영상 조회 (신규)
// Response: [{ missionId, missionTitle, status, collageVideoUrl, participants[] }]
// =============================================================================
app.get('/rooms/:id/albums/:date/collages', (req, res) => {
  const roomId = Number(req.params.id)
  const date   = req.params.date  // "YYYY-MM-DD"

  const dayMissions = db().get('missions')
    .filter((m) => m.room_id === roomId && m.status === 'COMPLETED' && m.date === date)
    .value()

  if (dayMissions.length === 0) return fail(res, 404, '해당 날짜 미션 없음')

  const members = db().get('room_members').filter({ room_id: roomId }).value()

  const data = dayMissions.map((m) => {
    const tmpl = db().get('mission_templates').find({ id: m.mission_template_id }).value()
    const subs = db().get('submissions').filter({ mission_id: m.id }).value()

    const participants = members.map((mbr) => {
      const u   = db().get('users').find({ id: mbr.user_id }).value()
      const sub = subs.find((s) => s.user_id === mbr.user_id)
      return {
        userId:       u?.id ?? mbr.user_id,
        name:         u?.name ?? '',
        profileImage: u?.profile_image ?? null,
        videoUrl:     sub?.video_url ?? null,
        submittedAt:  sub?.submitted_at ?? null,
        state:        sub ? 'done' : 'waiting',
      }
    })

    return {
      missionId:       m.id,
      missionTitle:    tmpl?.title ?? '',
      status:          'COMPLETED',
      collageVideoUrl: null,   // mock: 실제 영상 생성 불가 → null
      participants,
    }
  })

  ok(res, data, '콜라주 목록 조회 성공')
})

// GET /rooms/:id/albums/:date/synklog — SYNKLOG 조회 (API.md 명세서 기준)
// PROCESSING: { synklogId, date, status, synklogVideoUrl: null }
// COMPLETED:  { synklogId, date, status, synklogVideoUrl, thumbnail, missions:[{missionTitle}] }
// 없으면 404
app.get('/rooms/:id/albums/:date/synklog', (req, res) => {
  const roomId = Number(req.params.id)
  const date   = req.params.date  // "YYYY-MM-DD"

  const log = db().get('synklogs')
    .find((s) => s.room_id === roomId && s.date === date)
    .value()

  if (!log) return fail(res, 404, 'SYNKLOG 없음')

  const base = {
    synklogId:       log.id,
    date:            date.replace(/-/g, '.'),
    status:          log.status,
    synklogVideoUrl: log.synklog_video_url ?? null,
  }

  if (log.status !== 'COMPLETED') {
    return ok(res, base, 'SYNKLOG 생성 중')
  }

  // COMPLETED: missions 제목 목록 추가
  const dayMissions = db().get('missions')
    .filter((m) => m.room_id === roomId && m.status === 'COMPLETED' && m.date === date)
    .value()
  const missions = dayMissions.map((m) => {
    const tmpl = db().get('mission_templates').find({ id: m.mission_template_id }).value()
    return { missionTitle: tmpl?.title ?? '' }
  })

  ok(res, {
    ...base,
    thumbnail: log.thumbnail ?? null,
    missions,
  }, 'SYNKLOG 조회 성공')
})

// SYNKLOG 생성 요청 — Request: 없음 (API.md 기준)
// mock: 즉시 COMPLETED 처리 (실제 영상 생성 시뮬레이션 불가)
app.post('/rooms/:id/albums/:date/synklog', (req, res) => {
  const roomId = Number(req.params.id)
  const date   = req.params.date

  // 이미 있으면 400
  const existing = db().get('synklogs').find((s) => s.room_id === roomId && s.date === date).value()
  if (existing) return fail(res, 400, '이미 생성된 SYNKLOG 존재')

  const maxId = db().get('synklogs').maxBy('id').value()?.id ?? 0
  const log = {
    id:                maxId + 1,
    room_id:           roomId,
    date,
    synklog_video_url: null,
    thumbnail:         null,
    status:            'COMPLETED',  // mock: 즉시 완료
  }
  db().get('synklogs').push(log).write()
  ok(res, {
    synklogId: log.id,
    status:    log.status,
  }, 'SYNKLOG 생성 요청 완료')
})

// =============================================================================
// 채팅 (Chat)
// GET  /rooms/{roomId}/chats                           — 메시지 목록
// POST /rooms/{roomId}/chats                           — 메시지 전송
// POST /rooms/{roomId}/chats/{messageId}/reactions     — 리액션 추가
// =============================================================================

// GET /rooms/:id/chats — 채팅 목록 조회
// Response: { roomName, memberCount, todayMissionCompleted, todayMissionDate, messages[] }
app.get('/rooms/:id/chats', (req, res) => {
  const roomId = Number(req.params.id)
  const room   = db().get('rooms').find({ id: roomId }).value()
  if (!room) return fail(res, 404, '방 없음')

  const members = db().get('room_members').filter({ room_id: roomId }).value()

  // 오늘 미션 완료 여부
  const today = new Date().toISOString().slice(0, 10)
  const todayMissions = db().get('missions')
    .filter((m) => m.room_id === roomId && m.date === today)
    .value()
  const todayMissionCompleted = todayMissions.some((m) => m.status === 'COMPLETED')
  const todayMissionDate      = todayMissions.length > 0 ? today : null

  const chats = db().get('room_chats').filter({ room_id: roomId }).sortBy('id').value()

  const messages = chats.map((c) => {
    const u = db().get('users').find({ id: c.user_id }).value()
    return {
      messageId:    c.id,
      userId:       c.user_id,
      userName:     u?.name ?? '',
      profileImage: u?.profile_image ?? null,
      messageType:  c.message_type ?? 'TEXT',
      content:      c.content,
      createdAt:    c.created_at,
      isMyMessage:  c.user_id === getMeId(req),
      reactions:    [],
    }
  })

  ok(res, {
    roomName:             room.name,
    memberCount:          members.length,
    todayMissionCompleted,
    todayMissionDate,
    messages,
  }, '채팅 조회 성공')
})

// 리액션 추가 — chat_reactions 테이블에 저장 (ERD 기준)
// Request: { emoji }
// Response: data 없음 — { success, message: "리액션 추가 완료" }
app.post('/rooms/:id/chats/:messageId/reactions', (req, res) => {
  const chatId = Number(req.params.messageId)
  const userId = getMeId(req)
  const { emoji } = req.body
  if (!emoji) return fail(res, 400, 'emoji는 필수입니다')

  // 중복 체크 (chat_id + user_id + emoji 유니크)
  const existing = db().get('chat_reactions')
    .find({ chat_id: chatId, user_id: userId, emoji }).value()
  if (!existing) {
    const maxId = db().get('chat_reactions').maxBy('id').value()?.id ?? 0
    db().get('chat_reactions').push({
      id:         maxId + 1,
      chat_id:    chatId,
      user_id:    userId,
      emoji,
      created_at: new Date().toISOString(),
    }).write()
  }
  ok(res, null, '리액션 추가 완료')
})

// 채팅 메시지 전송
// Request: { content }  (message_type 없음)
// Response: { messageId, createdAt }
app.post('/rooms/:id/chats', (req, res) => {
  const roomId    = Number(req.params.id)
  const { content } = req.body
  const maxId     = db().get('room_chats').maxBy('id').value()?.id ?? 0
  const createdAt = new Date().toISOString()
  const chat = {
    id: maxId + 1,
    room_id: roomId,
    user_id: getMeId(req),
    message_type: 'TEXT',
    content,
    created_at: createdAt,
  }
  db().get('room_chats').push(chat).write()
  ok(res, {
    messageId: chat.id,
    createdAt: chat.created_at,
  }, '메시지 전송 완료')
})

// =============================================================================
// 도감 (Collections)
// GET /collections                       — 내가 완료한 미션 목감 목록
// GET /collections/missions/{missionId}  — 특정 미션 상세 + 내 기록
// =============================================================================

// 미션 상세 조회 — GET /collections/missions/{missionId}
// ERD 기준: mission_templates + collection_records JOIN rooms + submissions
// Response: { missionId, title, category, description, completedTimes, lastCompletedDate, records[] }
app.get('/collections/missions/:missionId', (req, res) => {
  const missionId = Number(req.params.missionId)
  const tmpl = db().get('mission_templates').find({ id: missionId }).value()
  if (!tmpl) return fail(res, 404, '미션 정보 없음')

  // 내 collection_records (이 미션 템플릿에 해당)
  const recs = db().get('collection_records')
    .filter({ user_id: getMeId(req), mission_template_id: missionId })
    .value()
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const completedTimes    = recs.length
  const lastRec           = recs[0]
  const lastCompletedDate = lastRec ? (lastRec.date ?? '').replace(/-/g, '.') : ''

  const records = recs.map((r) => {
    const room = db().get('rooms').find({ id: r.room_id }).value()
    const sub  = db().get('submissions').find({ id: r.submission_id }).value()
    return {
      recordId:  r.id,
      roomName:  room?.name ?? '',
      date:      (r.date ?? '').replace(/-/g, '.'),
      thumbnail: r.thumbnail ?? '',
      videoUrl:  sub?.video_url ?? '',
    }
  })

  ok(res, {
    missionId,
    title:             tmpl.title,
    description:       tmpl.description ?? '',
    completedTimes,
    lastCompletedDate,
    records,
  }, '미션 상세 조회 성공')
})

// 도감 목록 조회 — GET /collections
// Response: { completionRate, completedCount, totalCount, missions[] }
app.get('/collections', (req, res) => {
  // 내가 완료한 collection_records (= mission_template 별로 그룹)
  const records = db().get('collection_records').filter({ user_id: getMeId(req) }).value()
  const templates = db().get('mission_templates').value()
  const totalCount = templates.length

  // mission_template_id 기준으로 그룹핑
  const groupMap = {}
  records.forEach((r) => {
    const tid = r.mission_template_id
    if (!groupMap[tid]) groupMap[tid] = []
    groupMap[tid].push(r)
  })

  const completedTemplateIds = Object.keys(groupMap).map(Number)
  const completedCount = completedTemplateIds.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const missions = completedTemplateIds.map((tid) => {
    const tmpl    = db().get('mission_templates').find({ id: tid }).value()
    const recs    = groupMap[tid].sort((a, b) => new Date(b.date) - new Date(a.date))
    const latest  = recs[0]
    // YYYY-MM-DD → YYYY.MM.DD
    const lastDate = (latest.date ?? '').replace(/-/g, '.')
    return {
      missionId:         tid,
      title:             tmpl?.title ?? '',
      thumbnail:         latest.thumbnail ?? '',
      completedTimes:    recs.length,
      lastCompletedDate: lastDate,
    }
  })

  ok(res, { completionRate, completedCount, totalCount, missions }, '도감 조회 성공')
})

// =============================================================================
// 알림 (Notifications)
// GET /notifications — 알림 목록
// =============================================================================

// 알림 목록 조회 — GET /notifications
// 서버에서 today / thisWeek 로 그룹핑 후 camelCase 변환
app.get('/notifications', (req, res) => {
  const now       = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart  = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const toDto = (n) => ({
    id:        n.id,
    type:      n.type,
    title:     n.title,
    content:   n.content,
    createdAt: n.created_at,
    isRead:    n.is_read ?? false,
    relatedId: n.related_id ?? null,
  })

  const all = db().get('notifications').filter({ user_id: getMeId(req) }).value()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const today    = all.filter((n) => new Date(n.created_at) >= todayStart).map(toDto)
  const thisWeek = all.filter((n) => {
    const d = new Date(n.created_at)
    return d >= weekStart && d < todayStart
  }).map(toDto)

  ok(res, { today, thisWeek }, '알림 조회 성공')
})

// 스펙 미확정 — 읽음 처리
app.patch('/notifications/read-all', (req, res) => {
  db().get('notifications').filter({ user_id: getMeId(req) })
    .each((n) => { n.is_read = true }).write()
  ok(res, null)
})

app.patch('/notifications/:id/read', (req, res) => {
  db().get('notifications').find({ id: Number(req.params.id) })
    .assign({ is_read: true }).write()
  ok(res, null)
})

// =============================================================================
// json-server fallback — 위에서 처리 못한 나머지 기본 CRUD
// =============================================================================
router.render = (req, res) => {
  res.jsonp({ success: true, data: res.locals.data, message: 'success' })
}

app.use(router)

// =============================================================================
const PORT = 3001
app.listen(PORT, () => {
  console.log('')
  console.log('  🚀 SYNK Mock API Server  (API 명세서 기준)')
  console.log(`  📡 http://localhost:${PORT}`)
  console.log('  📦 mock/db.json')
  console.log('')
  console.log('  Auth')
  console.log('    POST /auth/kakao | /auth/google | /auth/logout')
  console.log('  User')
  console.log('    GET|PATCH|DELETE /users/me')
  console.log('    PATCH /users/me/notifications')
  console.log('  Room')
  console.log('    GET  /rooms/my')
  console.log('    POST /rooms | /rooms/join')
  console.log('    GET  /rooms/:id  |  PATCH /rooms/:id')
  console.log('    GET  /rooms/:id/invite')
  console.log('    DELETE /rooms/:id/leave')
  console.log('    GET  /rooms/:id/albums')
  console.log('    GET  /rooms/:id/albums/:date/synklog')
  console.log('    POST /rooms/:id/albums/:date/synklog')
  console.log('    GET|POST /rooms/:id/chats')
  console.log('    POST /rooms/:id/chats/:messageId/reactions')
  console.log('  Mission')
  console.log('    GET  /missions/active[?roomId=]')
  console.log('  Submission')
  console.log('    POST /submissions')
  console.log('    POST /submissions/missions/:id')
  console.log('    GET  /submissions/:id')
  console.log('  Collections')
  console.log('    GET  /collections')
  console.log('    GET  /collections/missions/:id')
  console.log('  Notifications')
  console.log('    GET  /notifications')
  console.log('  Debug (테스트용)')
  console.log('    POST /debug/rooms/:id/trigger-mission  ← 즉시 미션 강제 발동')
  console.log('')

  // ── 기존 데이터 backfill: COMPLETED 미션 → collection_records 생성 ────────
  initializeCollectionRecords()

  // ── 자동 미션 스케줄러 시작 ─────────────────────────────────────────────
  scheduleMissions() // 서버 기동 직후 1회 즉시 실행
  setInterval(scheduleMissions, SCHEDULER_INTERVAL_MS)
  console.log(`  ⏰ 미션 스케줄러 가동 중  (${SCHEDULER_INTERVAL_MS / 1000}초 간격, 시간 슬롯 방식)`)
  console.log('     → 방의 mission_start_time ~ mission_end_time 창 안에서만 동작')
  console.log('')
})
