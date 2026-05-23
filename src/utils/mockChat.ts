import type { RoomChat } from '@/types'

// Mock members (room 1 — 새벽반)
const U = [
  { id: 1, name: '유현' },
  { id: 2, name: '지은' },
  { id: 3, name: '민준' },
  { id: 4, name: '서연' },
  { id: 5, name: '태양' },
] as const

function minsAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString()
}
function daysAgo(days: number, minsOffset = 0): string {
  return new Date(Date.now() - days * 86_400_000 - minsOffset * 60_000).toISOString()
}

export const MOCK_CHAT_MESSAGES: RoomChat[] = [
  // ── 어제 ─────────────────────────────────────────────────────────
  {
    id: 1, room_id: 1, user_id: 3, message_type: 'TEXT',
    content: '야 내일 미션 뭔지 알아?',
    created_at: daysAgo(1, 20), user: U[2], reactions: [],
  },
  {
    id: 2, room_id: 1, user_id: 1, message_type: 'TEXT',
    content: '랜덤이잖아 ㅋㅋ 그냥 기다려',
    created_at: daysAgo(1, 18), user: U[0],
    reactions: [
      { id: 1, chat_id: 2, user_id: 3, emoji: '😂', created_at: daysAgo(1, 17) },
      { id: 2, chat_id: 2, user_id: 4, emoji: '😂', created_at: daysAgo(1, 16) },
    ],
  },
  {
    id: 3, room_id: 1, user_id: 5, message_type: 'TEXT',
    content: '오늘 다 참여할 수 있어?',
    created_at: daysAgo(1, 10), user: U[4], reactions: [],
  },
  {
    id: 4, room_id: 1, user_id: 2, message_type: 'TEXT',
    content: '나 내일 늦을 수도 있는데 최대한 해볼게',
    created_at: daysAgo(1, 8), user: U[1], reactions: [],
  },
  {
    id: 5, room_id: 1, user_id: 1, message_type: 'TEXT',
    content: '5분이니까 어디서든 가능해 화이팅 ✊',
    created_at: daysAgo(1, 6), user: U[0],
    reactions: [
      { id: 3, chat_id: 5, user_id: 2, emoji: '👍', created_at: daysAgo(1, 5) },
      { id: 4, chat_id: 5, user_id: 5, emoji: '👍', created_at: daysAgo(1, 5) },
    ],
  },

  // ── 오늘 ─────────────────────────────────────────────────────────
  {
    id: 6, room_id: 1, user_id: 2, message_type: 'TEXT',
    content: '야 미션 울렸다!!!!',
    created_at: minsAgo(25), user: U[1],
    reactions: [
      { id: 5, chat_id: 6, user_id: 1, emoji: '🔥', created_at: minsAgo(24) },
      { id: 6, chat_id: 6, user_id: 5, emoji: '🔥', created_at: minsAgo(24) },
      { id: 7, chat_id: 6, user_id: 3, emoji: '🔥', created_at: minsAgo(23) },
    ],
  },
  {
    id: 7, room_id: 1, user_id: 4, message_type: 'TEXT',
    content: '진짜?? 나 지금 밖이야 어떡해 ㅠ',
    created_at: minsAgo(24), user: U[3], reactions: [],
  },
  {
    id: 8, room_id: 1, user_id: 1, message_type: 'TEXT',
    content: '빨리 찍어!! 5분이야',
    created_at: minsAgo(23), user: U[0],
    reactions: [
      { id: 8, chat_id: 8, user_id: 4, emoji: '😂', created_at: minsAgo(22) },
    ],
  },
  {
    id: 9, room_id: 1, user_id: 4, message_type: 'TEXT',
    content: '알아알아 찍고 있어',
    created_at: minsAgo(22), user: U[3], reactions: [],
  },
  {
    id: 10, room_id: 1, user_id: 3, message_type: 'TEXT',
    content: '나는 제출함 ✅',
    created_at: minsAgo(18), user: U[2],
    reactions: [
      { id: 9, chat_id: 10, user_id: 2, emoji: '👍', created_at: minsAgo(17) },
    ],
  },
  {
    id: 11, room_id: 1, user_id: 5, message_type: 'TEXT',
    content: '나도 제출!',
    created_at: minsAgo(17), user: U[4], reactions: [],
  },
  {
    id: 12, room_id: 1, user_id: 4, message_type: 'TEXT',
    content: '저도요 ㅋㅋ 길에서 찍었어요',
    created_at: minsAgo(15), user: U[3],
    reactions: [
      { id: 10, chat_id: 12, user_id: 1, emoji: '😂', created_at: minsAgo(14) },
      { id: 11, chat_id: 12, user_id: 2, emoji: '😂', created_at: minsAgo(14) },
      { id: 12, chat_id: 12, user_id: 3, emoji: '😂', created_at: minsAgo(13) },
    ],
  },
  {
    id: 13, room_id: 1, user_id: 2, message_type: 'TEXT',
    content: '콜라주 결과 대박이다 ㅋㅋ 우리 어제꺼보다 훨씬 낫네',
    created_at: minsAgo(10), user: U[1],
    reactions: [
      { id: 13, chat_id: 13, user_id: 1, emoji: '❤️', created_at: minsAgo(9) },
      { id: 14, chat_id: 13, user_id: 5, emoji: '❤️', created_at: minsAgo(9) },
    ],
  },
  {
    id: 14, room_id: 1, user_id: 1, message_type: 'TEXT',
    content: '100% 참여율이잖아 ㅋㅋㅋ 처음이지?',
    created_at: minsAgo(8), user: U[0],
    reactions: [
      { id: 15, chat_id: 14, user_id: 3, emoji: '🎉', created_at: minsAgo(7) },
      { id: 16, chat_id: 14, user_id: 4, emoji: '🎉', created_at: minsAgo(7) },
      { id: 17, chat_id: 14, user_id: 2, emoji: '🎉', created_at: minsAgo(6) },
    ],
  },
  {
    id: 15, room_id: 1, user_id: 3, message_type: 'TEXT',
    content: '맞아 처음이야!! 다음 미션도 파이팅 🙌',
    created_at: minsAgo(5), user: U[2], reactions: [],
  },
]

/** "오늘" / "어제" / "YYYY.MM.DD" */
export function formatDateLabel(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return '오늘'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '어제'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** ISO → "HH:MM" (24h) */
export function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 || 12
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`
}
