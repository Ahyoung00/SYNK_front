// STOMP WebSocket은 RoomChatPage에서만 직접 연결 관리

export function useRoomWebSocket(_roomId: number | undefined) {
  // 채팅 페이지(RoomChatPage)에서 connectStomp()로 직접 관리
}

export function useChatSocket(_roomId: number | undefined) {
  return {}
}
