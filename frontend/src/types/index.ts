// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface User {
  id: number
  username: string
  email: string
  display_name: string
  avatar: string | null
  bio: string
  created_at: string
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------
export type Role = 'room_creator' | 'moderator' | 'participant' | 'viewer'

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export type StageLayout = 'single' | 'side_by_side' | 'grid' | 'presentation'

export interface Room {
  id: string
  name: string
  slug: string
  description: string
  is_active: boolean
  default_layout: StageLayout
  settings_json: Record<string, unknown>
  created_at: string
  updated_at: string
  owner_display: string
  member_count: number
}

export interface RoomMembership {
  id: number
  user: number
  user_display: string
  user_email: string
  user_avatar: string | null
  role: Role
  permissions: Record<string, boolean>
  joined_at: string
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------
export interface StageParticipant {
  id: number
  user: number
  user_display: string
  user_avatar: string | null
  position: number
  is_pinned: boolean
  is_spotlighted: boolean
  is_muted: boolean
  camera_off: boolean
  added_at: string
}

export interface Stage {
  id: number
  layout: StageLayout
  is_live: boolean
  participants: StageParticipant[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Media Sources
// ---------------------------------------------------------------------------
export type MediaSourceType = 'pdf' | 'slides' | 'image' | 'video' | 'youtube' | 'screen' | 'webcam'

export interface MediaSource {
  id: string
  source_type: MediaSourceType
  title: string
  file_url: string | null
  url: string
  thumbnail_url: string | null
  is_active: boolean
  metadata: Record<string, unknown>
  uploaded_by: number | null
  uploaded_by_display: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------
export type StreamStatus = 'idle' | 'recording' | 'live' | 'ended'
export type StreamDestination = 'youtube' | 'local'

export interface StreamSession {
  id: string
  status: StreamStatus
  destination: StreamDestination
  youtube_broadcast_id: string
  youtube_stream_url: string
  started_at: string | null
  ended_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export type InviteRole = 'moderator' | 'participant' | 'viewer'

export interface Invitation {
  id: string
  token: string
  role: InviteRole
  expires_at: string | null
  is_active: boolean
  max_uses: number | null
  use_count: number
  created_at: string
  invite_url: string
  is_valid: boolean
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export interface RoomNote {
  id: number
  content: string
  updated_by_display: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// WebSocket event shapes
// ---------------------------------------------------------------------------
export interface WsEvent {
  type: string
  [key: string]: unknown
}

export interface ChatMessageEvent extends WsEvent {
  type: 'chat.message'
  user_id: number
  display_name: string
  body: string
}

export interface ParticipantJoinedEvent extends WsEvent {
  type: 'participant.joined'
  user_id: number
  display_name: string
}

export interface ParticipantLeftEvent extends WsEvent {
  type: 'participant.left'
  user_id: number
}

export interface ParticipantUpdatedEvent extends WsEvent {
  type: 'participant.updated'
  user_id: number
  hand_raised?: boolean
}

export interface StageUpdatedEvent extends WsEvent {
  type: 'stage.updated'
  action: 'add' | 'remove' | 'mute' | 'pin' | 'spotlight'
  target_user_id: number
  by_user_id: number
  muted?: boolean
  pinned?: boolean
  spotlighted?: boolean
}

export interface StreamStatusChangedEvent extends WsEvent {
  type: 'stream.status_changed'
  status: StreamStatus
}

export interface MediaUpdatedEvent extends WsEvent {
  type: 'media.updated'
  media_id: string
}

export interface NoteUpdatedEvent extends WsEvent {
  type: 'note.updated'
  content: string
  by_user_id: number
}

export interface RoomErrorEvent extends WsEvent {
  type: 'room.error'
  message: string
}

// ---------------------------------------------------------------------------
// Stage content state machine
// ---------------------------------------------------------------------------
export type StageContentType =
  | 'participants'   // default: show participant tile grid
  | 'pdf'
  | 'image'
  | 'video'
  | 'youtube'
  | 'screen'
  | 'scene'

export interface StageContent {
  type: StageContentType
  /** Media source ID (for pdf/image/video/youtube) or scene ID (for scene) */
  id: string | null
  /** Resolved URL to display (file_url or url from MediaSource, or youtube embed) */
  url?: string
  title?: string
}

export interface Scene {
  id: string
  name: string
  /** 'split' = media left + participant right; 'pip' = participant in corner;
   *  'fullscreen' = fullscreen media; 'grid' = participant grid only */
  layout: 'split' | 'pip' | 'fullscreen' | 'grid'
}

// ---------------------------------------------------------------------------
// Stream composition — PiP overlays + audio routing
// ---------------------------------------------------------------------------

/** Corner/edge position for an overlay participant card on the stage canvas. */
export type OverlayPosition = 'br' | 'bl' | 'tr' | 'tl' | 'side'

export interface OverlayParticipant {
  userId: number
  position: OverlayPosition
  /** Fraction of stage width (0–1). Default 0.25. */
  size: number
}

// ---------------------------------------------------------------------------
// Local participant state (browser-side, not from API)
// ---------------------------------------------------------------------------
export interface LocalParticipant {
  userId: number
  displayName: string
  isOnStage: boolean
  isMuted: boolean
  cameraOff: boolean
  handRaised: boolean
  streamRef?: MediaStream
}
