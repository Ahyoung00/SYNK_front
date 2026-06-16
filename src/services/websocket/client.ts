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
    reconnectDelay: 5000,
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
      console.error('[STOMP] error', frame)
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

export const wsClient = {
  connect: () => {},
  disconnect: () => {},
  on: () => () => {},
  off: () => {},
  send: () => {},
}
