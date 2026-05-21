import { useState, useEffect, useCallback } from 'react'
import { roomsApi, stageApi, mediaApi, streamingApi, invitationsApi, notesApi } from '@/services/api'
import { useStudioWebSocket } from './useStudioWebSocket'
import { useAuth } from '@/context/AuthContext'
import type {
  Room, RoomMembership, Stage, MediaSource, StreamSession,
  Invitation, RoomNote, ChatMessageEvent, StageUpdatedEvent,
  StreamStatusChangedEvent, NoteUpdatedEvent,
  LocalParticipant, Role, StageContent, Scene,
  OverlayParticipant, OverlayPosition,
} from '@/types'

export interface ChatMessage {
  userId: number
  displayName: string
  body: string
  timestamp: number
}

export function useStudio(roomSlug: string) {
  const { user } = useAuth()
  const { send, on } = useStudioWebSocket(roomSlug)

  const [room, setRoom] = useState<Room | null>(null)
  const [membership, setMembership] = useState<RoomMembership | null>(null)
  const [members, setMembers] = useState<RoomMembership[]>([])
  const [stage, setStage] = useState<Stage | null>(null)
  const [mediaItems, setMediaItems] = useState<MediaSource[]>([])
  const [streamSession, setStreamSession] = useState<{ status: string } | StreamSession | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [note, setNote] = useState<RoomNote | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<LocalParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Stage content state machine: controls what renders on the stage
  const [activeContent, setActiveContent] = useState<StageContent>({ type: 'participants', id: null })
  const [liveContent, setLiveContent] = useState<StageContent>({ type: 'participants', id: null })
  // PiP overlay participants shown on top of background media content
  const [overlayParticipants, setOverlayParticipants] = useState<OverlayParticipant[]>([])
  // Which participant's audio is routed to the stream output (null = all/floor)
  const [activeAudioSource, setActiveAudioSourceState] = useState<number | null>(null)
  // Built-in scenes
  const scenes: Scene[] = [
    { id: 'grid', name: 'Participant Grid', layout: 'grid' },
    { id: 'split', name: 'Speaker + Slides', layout: 'split' },
    { id: 'fullscreen', name: 'Slides Fullscreen', layout: 'fullscreen' },
    { id: 'pip', name: 'Screen + Interpreter', layout: 'pip' },
  ]

  // Initial data load
  useEffect(() => {
    if (!roomSlug) return
    setIsLoading(true)
    Promise.all([
      roomsApi.get(roomSlug),
      roomsApi.members(roomSlug),
      stageApi.get(roomSlug),
      mediaApi.list(roomSlug),
      streamingApi.status(roomSlug),
      notesApi.get(roomSlug),
    ])
      .then(([r, mems, s, media, stream, n]) => {
        setRoom(r)
        setMembers(mems)
        const me = mems.find((m) => m.user === user?.id)
        if (me) setMembership(me)
        setStage(s)
        setMediaItems(media)
        setStreamSession(stream)
        setNote(n)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [roomSlug, user?.id])

  // Load invitations (only for moderators/creators)
  useEffect(() => {
    if (!membership) return
    if (['room_creator', 'moderator'].includes(membership.role)) {
      invitationsApi.list(roomSlug).then(setInvitations).catch(() => {})
    }
  }, [roomSlug, membership])

  // WebSocket event subscriptions
  useEffect(() => {
    const unsubs = [
      on('chat.message', (e) => {
        const ev = e as ChatMessageEvent
        setChatMessages((prev) => [
          ...prev,
          { userId: ev.user_id, displayName: ev.display_name, body: ev.body, timestamp: Date.now() },
        ])
      }),
      on('stage.updated', (_e) => {
        const ev = _e as StageUpdatedEvent
        // Refresh stage from API on structural changes
        if (['add', 'remove'].includes(ev.action)) {
          stageApi.get(roomSlug).then(setStage).catch(() => {})
        } else {
          // Optimistic update for mute/pin/spotlight
          setStage((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.user === ev.target_user_id
                  ? {
                      ...p,
                      is_muted: ev.action === 'mute' ? !!ev.muted : p.is_muted,
                      is_pinned: ev.action === 'pin' ? !!ev.pinned : p.is_pinned,
                      is_spotlighted: ev.action === 'spotlight' ? !!ev.spotlighted : p.is_spotlighted,
                    }
                  : p
              ),
            }
          })
        }
      }),
      on('stream.status_changed', (e) => {
        const ev = e as StreamStatusChangedEvent
        setStreamSession((prev) => (prev ? { ...prev, status: ev.status } : { status: ev.status }))
      }),
      on('media.updated', (_e) => {
        mediaApi.list(roomSlug).then(setMediaItems).catch(() => {})
      }),
      on('note.updated', (e) => {
        const ev = e as NoteUpdatedEvent
        setNote((prev) => prev ? { ...prev, content: ev.content } : null)
      }),
      on('participant.joined', (e) => {
        const { user_id, display_name } = e as unknown as { user_id: number; display_name: string }
        setOnlineUsers((prev) =>
          prev.some((p) => p.userId === user_id)
            ? prev
            : [...prev, { userId: user_id, displayName: String(display_name), isOnStage: false, isMuted: false, cameraOff: false, handRaised: false }]
        )
      }),
      on('participant.left', (e) => {
        const { user_id } = e as unknown as { user_id: number }
        setOnlineUsers((prev) => prev.filter((p) => p.userId !== user_id))
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [on, roomSlug])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const sendChat = useCallback((body: string) => {
    send('chat.send', { body })
  }, [send])

  const addToStage = useCallback(async (userId: number) => {
    const updated = await stageApi.addParticipant(roomSlug, userId)
    setStage(updated)
    send('stage.add_participant', { user_id: userId })
  }, [roomSlug, send])

  const removeFromStage = useCallback(async (userId: number) => {
    const updated = await stageApi.removeParticipant(roomSlug, userId)
    setStage(updated)
    send('stage.remove_participant', { user_id: userId })
  }, [roomSlug, send])

  const muteParticipant = useCallback(async (userId: number, muted: boolean) => {
    const updated = await stageApi.updateParticipant(roomSlug, userId, { is_muted: muted })
    setStage(updated)
    send('stage.mute', { user_id: userId, muted })
  }, [roomSlug, send])

  const pinParticipant = useCallback(async (userId: number, pinned: boolean) => {
    const updated = await stageApi.updateParticipant(roomSlug, userId, { is_pinned: pinned })
    setStage(updated)
    send('stage.pin', { user_id: userId, pinned })
  }, [roomSlug, send])

  const spotlightParticipant = useCallback(async (userId: number, spotlighted: boolean) => {
    const updated = await stageApi.updateParticipant(roomSlug, userId, { is_spotlighted: spotlighted })
    setStage(updated)
    send('stage.spotlight', { user_id: userId, spotlighted })
  }, [roomSlug, send])

  const activateMedia = useCallback(async (mediaId: string) => {
    const updated = await mediaApi.activate(roomSlug, mediaId)
    setMediaItems((prev) => prev.map((m) => ({ ...m, is_active: m.id === updated.id })))
    send('media.switch', { media_id: mediaId })
  }, [roomSlug, send])

  /** Put a media item onto the preview stage. */
  const presentMedia = useCallback((item: MediaSource) => {
    setActiveContent({
      type: item.source_type as StageContent['type'],
      id: item.id,
      url: item.file_url ?? item.url ?? undefined,
      title: item.title,
    })
  }, [])

  /** Revert stage preview to the participant tile grid. */
  const showParticipants = useCallback(() => {
    setActiveContent({ type: 'participants', id: null })
  }, [])

  /** Activate a scene layout preset. */
  const activateScene = useCallback((scene: Scene) => {
    setActiveContent({ type: 'scene', id: scene.id, title: scene.name })
  }, [])

  /** Push preview content to live output. */
  const pushLive = useCallback(() => {
    setLiveContent(activeContent)
    send('media.switch', { content_type: activeContent.type, content_id: activeContent.id })
  }, [activeContent, send])

  const updateNote = useCallback(async (content: string) => {
    const updated = await notesApi.update(roomSlug, content)
    setNote(updated)
    send('note.update', { content })
  }, [roomSlug, send])

  const startStream = useCallback(async (data: { destination: string; stream_key?: string; youtube_stream_url?: string }) => {
    const session = await streamingApi.start(roomSlug, data)
    setStreamSession(session)
    send('stream.status_changed', { status: session.status })
    return session
  }, [roomSlug, send])

  const stopStream = useCallback(async () => {
    const session = await streamingApi.stop(roomSlug)
    setStreamSession(session)
    send('stream.status_changed', { status: session.status })
  }, [roomSlug, send])

  const createInvitation = useCallback(async (data: { role: string; expires_at?: string; max_uses?: number }) => {
    const inv = await invitationsApi.create(roomSlug, data)
    setInvitations((prev) => [inv, ...prev])
    return inv
  }, [roomSlug])

  const revokeInvitation = useCallback(async (invitationId: string) => {
    await invitationsApi.revoke(roomSlug, invitationId)
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
  }, [roomSlug])

  const assignRole = useCallback(async (userId: number, role: Role) => {
    const updated = await roomsApi.assignRole(roomSlug, userId, role)
    setMembers((prev) => prev.map((m) => (m.user === userId ? updated : m)))
    if (updated.user === user?.id) setMembership(updated)
  }, [roomSlug, user?.id])

  const removeMember = useCallback(async (userId: number) => {
    await roomsApi.removeMember(roomSlug, userId)
    setMembers((prev) => prev.filter((m) => m.user !== userId))
    // Also remove from stage if present
    const updated = await stageApi.get(roomSlug).catch(() => stage)
    if (updated) setStage(updated)
  }, [roomSlug, stage])

  const raiseHand = useCallback(() => send('participant.raise_hand', {}), [send])
  const lowerHand = useCallback(() => send('participant.lower_hand', {}), [send])

  /** Add a participant as a PiP overlay on the stage canvas. */
  const addToOverlay = useCallback((userId: number, position: OverlayPosition = 'br') => {
    setOverlayParticipants((prev) =>
      prev.some((p) => p.userId === userId) ? prev : [...prev, { userId, position, size: 0.25 }]
    )
  }, [])

  /** Remove a participant from the PiP overlay. */
  const removeFromOverlay = useCallback((userId: number) => {
    setOverlayParticipants((prev) => prev.filter((p) => p.userId !== userId))
  }, [])

  /** Move an overlay participant to a different corner/edge. */
  const setOverlayPosition = useCallback((userId: number, position: OverlayPosition) => {
    setOverlayParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, position } : p))
    )
  }, [])

  /** Select which participant's mic audio is routed to the stream output.
   *  Pass null to route floor audio (no interpreter selected). */
  const setActiveAudioSource = useCallback((userId: number | null) => {
    setActiveAudioSourceState(userId)
    send('audio.switch_source', { user_id: userId })
  }, [send])

  return {
    // State
    room, membership, members, stage, mediaItems, streamSession,
    invitations, note, chatMessages, onlineUsers, isLoading,
    // Stage content
    activeContent, liveContent, scenes,
    // Stream composition
    overlayParticipants, activeAudioSource,
    // Actions
    sendChat, addToStage, removeFromStage, muteParticipant, pinParticipant,
    spotlightParticipant, activateMedia, presentMedia, showParticipants,
    activateScene, pushLive,
    updateNote, startStream, stopStream,
    createInvitation, revokeInvitation, assignRole, removeMember,
    raiseHand, lowerHand,
    // Composition actions
    addToOverlay, removeFromOverlay, setOverlayPosition, setActiveAudioSource,
    // Raw send for advanced use
    send,
  }
}
