import { WS_BASE_URL, STORAGE_KEYS } from '@/constants'
import type { WsEvent, WsEventType } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight WebSocket client with auto-reconnect
// Spring Boot back-end uses STOMP over WebSocket; swap in a STOMP lib if needed
// ─────────────────────────────────────────────────────────────────────────────

type Handler<T = unknown> = (event: WsEvent<T>) => void

class SynkWebSocket {
  private ws: WebSocket | null = null
  private handlers = new Map<WsEventType, Set<Handler>>()
  private reconnectDelay = 1000
  private roomId: number | null = null
  private shouldReconnect = false

  connect(roomId: number) {
    this.roomId = roomId
    this.shouldReconnect = true
    this._open()
  }

  private _open() {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    const url = `${WS_BASE_URL}/rooms/${this.roomId}?token=${token}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.info('[WS] connected to room', this.roomId)
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data as string) as WsEvent
        const set = this.handlers.get(event.type)
        set?.forEach((h) => h(event))
      } catch {
        console.warn('[WS] failed to parse message', ev.data)
      }
    }

    this.ws.onclose = () => {
      console.info('[WS] disconnected')
      if (this.shouldReconnect) {
        setTimeout(() => this._open(), this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
      }
    }

    this.ws.onerror = (err) => {
      console.error('[WS] error', err)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.ws?.close()
    this.ws = null
    this.roomId = null
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  on<T>(type: WsEventType, handler: Handler<T>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler as Handler)
    return () => this.off(type, handler as Handler)
  }

  off(type: WsEventType, handler: Handler) {
    this.handlers.get(type)?.delete(handler)
  }
}

// Singleton instance — shared across the app
export const wsClient = new SynkWebSocket()
