import type { WsEvent } from '@/types'

type EventHandler = (event: WsEvent) => void

export class StudioWebSocket {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false

  constructor(private readonly roomSlug: string) {}

  connect(): void {
    this.closed = false
    this._open()
  }

  private _open(): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/ws/studio/${this.roomSlug}/`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data)
        this._dispatch(event)
      } catch {
        // ignore malformed frames
      }
    }

    this.ws.onclose = () => {
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
          this._open()
        }, this.reconnectDelay)
      }
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
    }
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)?.delete(handler)
  }

  private _dispatch(event: WsEvent): void {
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach((h) => h(event))
    }
    // Wildcard handlers registered under '*'
    const wildcards = this.handlers.get('*')
    if (wildcards) {
      wildcards.forEach((h) => h(event))
    }
  }

  disconnect(): void {
    this.closed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}
