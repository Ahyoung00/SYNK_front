/**
 * 방별 "마지막으로 읽은 채팅 messageId"를 localStorage에 저장/조회.
 * 서버에 unread 표시가 없어 클라이언트에서 새 채팅 여부를 판단하는 용도.
 */
const KEY = (roomId: number | string) => `synk_chat_lastread_${roomId}`

export function getLastReadMessageId(roomId: number | string): number {
  const v = localStorage.getItem(KEY(roomId))
  return v ? Number(v) || 0 : 0
}

export function setLastReadMessageId(roomId: number | string, messageId: number): void {
  if (!messageId) return
  const prev = getLastReadMessageId(roomId)
  if (messageId > prev) localStorage.setItem(KEY(roomId), String(messageId))
}

/** 최신 messageId가 마지막으로 읽은 id보다 크면 새 채팅이 있는 것으로 간주 */
export function hasUnread(roomId: number | string, latestMessageId: number): boolean {
  if (!latestMessageId) return false
  return latestMessageId > getLastReadMessageId(roomId)
}
