import { Client } from '@stomp/stompjs'
import { STORAGE_KEYS } from '@/constants'

let stompClient: Client | null = null
const pendingMessages: Array<{ roomId: number; content: string }> = []

function getToken(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    return raw
      ? (JSON.parse(raw) as { state?: { token?: string } }).state?.token ?? ''
      : ''
  } catch {
    return ''
  }
}

export function connectStomp(
  roomId: number,
  onMessage: (msg: unknown) => void,
): () => void {
  if (stompClient?.active) {
    stompClient.deactivate()
  }

  const token = getToken()

  const client = new Client({
    brokerURL: 'wss://api.synk.ai.kr/ws',
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 0,
    onConnect: () => {
      console.info('[STOMP] connected to room', roomId)

      client.subscribe(`/topic/rooms/${roomId}`, (frame) => {
        try {
          onMessage(JSON.parse(frame.body))
        } catch {
          console.warn('[STOMP] parse error', frame.body)
        }
      })

      // 연결 전 쌓인 메시지 전송
      pendingMessages
        .filter((m) => m.roomId === roomId)
        .forEach((m) => {
          client.publish({
            destination: `/app/rooms/${m.roomId}/chat`,
            body: JSON.stringify({ content: m.content, messageType: 'TEXT' }),
          })
        })
      pendingMessages.length = 0
    },
    onStompError: (frame) => {
      console.error('[STOMP] broker error', frame.headers, frame.body)
    },
    onWebSocketError: (event) => {
      console.error('[STOMP] WebSocket error event', event)
    },
    onWebSocketClose: (event) => {
      console.error('[STOMP] WebSocket closed — code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
    },
    onDisconnect: () => {
      console.info('[STOMP] disconnected')
    },
  })

  client.activate()
  stompClient = client

  return () => {
    client.deactivate()
    stompClient = null
  }
}

export function publishChat(roomId: number, content: string) {
  if (stompClient?.active && stompClient.connected) {
    stompClient.publish({
      destination: `/app/rooms/${roomId}/chat`,
      body: JSON.stringify({ content, messageType: 'TEXT' }),
    })
  } else {
    // 아직 연결 중이면 큐에 쌓아두기
    pendingMessages.push({ roomId, content })
  }
}

/** 홈탭용: 여러 방 토픽을 하나의 STOMP 연결로 구독. 반환값은 cleanup 함수. */
export function subscribeRooms(
  roomIds: number[],
  onEvent: (event: unknown) => void,
): () => void {
  if (roomIds.length === 0) return () => {}

  const token = getToken()
  const client = new Client({
    brokerURL: 'wss://api.synk.ai.kr/ws',
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    onConnect: () => {
      console.info('[STOMP:home] connected, subscribing rooms:', roomIds)
      roomIds.forEach((id) => {
        client.subscribe(`/topic/rooms/${id}`, (frame) => {
          try { onEvent(JSON.parse(frame.body)) }
          catch { console.warn('[STOMP:home] parse error', frame.body) }
        })
      })
    },
    onStompError: (frame) => console.error('[STOMP:home] error', frame.body),
  })
  client.activate()
  return () => client.deactivate()
}

export const wsClient = {
  connect: () => {},
  disconnect: () => {},
  on: () => () => {},
  off: () => {},
  send: () => {},
}
