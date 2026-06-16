import type { RoomChatMessage } from '@/types'

export const MOCK_CHAT_MESSAGES: RoomChatMessage[] = []

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

/** ISO → "오전/오후 H:MM" */
export function formatTime(isoStr: string): string {
  // 백엔드가 Z 없이 UTC 시간을 보내므로 강제로 UTC로 파싱
  const normalized = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z'
  const d = new Date(normalized)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 || 12
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`
}
