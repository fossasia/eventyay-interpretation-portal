import { useEffect, useRef, useCallback } from 'react'
import { StudioWebSocket } from '@/services/websocket'
import type { WsEvent } from '@/types'

export function useStudioWebSocket(roomSlug: string) {
  const wsRef = useRef<StudioWebSocket | null>(null)

  useEffect(() => {
    const ws = new StudioWebSocket(roomSlug)
    ws.connect()
    wsRef.current = ws
    return () => ws.disconnect()
  }, [roomSlug])

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    wsRef.current?.send(type, payload)
  }, [])

  const on = useCallback((type: string, handler: (event: WsEvent) => void) => {
    return wsRef.current?.on(type, handler) ?? (() => {})
  }, [])

  return { send, on, wsRef }
}
