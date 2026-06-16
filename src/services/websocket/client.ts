import { Client } from '@stomp/stompjs'
import { STORAGE_KEYS } from '@/constants'

let stompClient: Client | null = null

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

  const client = new Client({
    brokerURL: 'wss://api.synkapp.co.kr/ws',
    connectHeaders: {
      Authorization: `Bearer ${getToken()}`,
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
    },
    onStompError: (frame) => {
      console.error('[STOMP] error', frame)
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
  if (!stompClient?.active) return
  stompClient.publish({
    destination: `/app/rooms/${roomId}/chat`,
    body: JSON.stringify({ content, messageType: 'TEXT' }),
  })
}

// 레거시 호환용 (wsClient 참조하는 곳이 있을 경우 대비)
export const wsClient = {
  connect: () => {},
  disconnect: () => {},
  on: () => () => {},
  off: () => {},
  send: () => {},
}
