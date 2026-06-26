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
  // 백엔드 createdAt은 KST naive 값 → 받은 문자열을 그대로 로컬(KST)로 파싱
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 || 12
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`
}

/** 현재 시각을 서버와 동일한 KST naive 문자열로 (YYYY-MM-DDTHH:mm:ss) — optimistic update용 */
export function localNaiveNow(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
