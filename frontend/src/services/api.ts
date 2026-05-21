/**
 * Typed API client wrapping fetch.
 * All requests include the auth token from localStorage when present.
 */

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Token ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(errorData.detail ?? 'Request failed'), {
      status: res.status,
      data: errorData,
    })
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Token ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(errorData.detail ?? 'Upload failed'), {
      status: res.status,
      data: errorData,
    })
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
import type { User, Room, RoomMembership, Stage, MediaSource, StreamSession, Invitation, RoomNote } from '@/types'

export const authApi = {
  register: (data: { username: string; email: string; password: string; password_confirm: string; display_name?: string }) =>
    request<{ user: User; token: string }>('POST', '/auth/register/', data),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>('POST', '/auth/login/', data),

  logout: () => request<void>('POST', '/auth/logout/'),

  profile: () => request<User>('GET', '/auth/profile/'),

  updateProfile: (data: Partial<Pick<User, 'display_name' | 'bio'>>) =>
    request<User>('PATCH', '/auth/profile/', data),
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const roomsApi = {
  list: () => request<Room[]>('GET', '/rooms/'),

  create: (data: { name: string; description?: string; default_layout?: string }) =>
    request<Room>('POST', '/rooms/', data),

  get: (slug: string) => request<Room>('GET', `/rooms/${slug}/`),

  update: (slug: string, data: Partial<Room>) =>
    request<Room>('PATCH', `/rooms/${slug}/`, data),

  delete: (slug: string) => request<void>('DELETE', `/rooms/${slug}/`),

  join: (slug: string) => request<RoomMembership>('POST', `/rooms/${slug}/join/`),

  leave: (slug: string) => request<void>('DELETE', `/rooms/${slug}/leave/`),

  members: (slug: string) => request<RoomMembership[]>('GET', `/rooms/${slug}/members/`),

  assignRole: (slug: string, userId: number, role: string) =>
    request<RoomMembership>('PATCH', `/rooms/${slug}/members/${userId}/role/`, { role }),

  removeMember: (slug: string, userId: number) =>
    request<void>('DELETE', `/rooms/${slug}/members/${userId}/remove/`),
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------
export const stageApi = {
  get: (slug: string) => request<Stage>('GET', `/rooms/${slug}/stage/`),

  addParticipant: (slug: string, userId: number) =>
    request<Stage>('POST', `/rooms/${slug}/stage/add/`, { user_id: userId }),

  updateParticipant: (slug: string, userId: number, data: Partial<{ is_muted: boolean; is_pinned: boolean; is_spotlighted: boolean; camera_off: boolean; position: number }>) =>
    request<Stage>('PATCH', `/rooms/${slug}/stage/${userId}/`, data),

  removeParticipant: (slug: string, userId: number) =>
    request<Stage>('DELETE', `/rooms/${slug}/stage/${userId}/`),
}

// ---------------------------------------------------------------------------
// Media Sources
// ---------------------------------------------------------------------------
export const mediaApi = {
  list: (slug: string) => request<MediaSource[]>('GET', `/media/rooms/${slug}/`),

  upload: (slug: string, formData: FormData) =>
    upload<MediaSource>(`/media/rooms/${slug}/`, formData),

  delete: (slug: string, mediaId: string) =>
    request<void>('DELETE', `/media/rooms/${slug}/${mediaId}/`),

  activate: (slug: string, mediaId: string) =>
    request<MediaSource>('POST', `/media/rooms/${slug}/${mediaId}/activate/`),
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------
export const streamingApi = {
  status: (slug: string) => request<{ status: string } | StreamSession>('GET', `/streaming/rooms/${slug}/status/`),

  start: (slug: string, data: { destination: string; stream_key?: string; youtube_stream_url?: string }) =>
    request<StreamSession>('POST', `/streaming/rooms/${slug}/start/`, data),

  stop: (slug: string) => request<StreamSession>('POST', `/streaming/rooms/${slug}/stop/`),
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export const invitationsApi = {
  list: (slug: string) => request<Invitation[]>('GET', `/invitations/rooms/${slug}/`),

  create: (slug: string, data: { role: string; expires_at?: string; max_uses?: number }) =>
    request<Invitation>('POST', `/invitations/rooms/${slug}/`, data),

  revoke: (slug: string, invitationId: string) =>
    request<void>('DELETE', `/invitations/rooms/${slug}/${invitationId}/`),

  /** Validate token without accepting — public endpoint, no auth required */
  validate: (token: string) =>
    request<{ room_name: string; room_slug: string; role: string; valid: boolean }>('GET', `/invitations/validate/${token}/`),

  accept: (token: string) =>
    request<{ detail: string; room_slug: string; role: string }>('POST', `/invitations/accept/${token}/`),
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export const notesApi = {
  get: (slug: string) => request<RoomNote>('GET', `/notes/rooms/${slug}/`),

  update: (slug: string, content: string) =>
    request<RoomNote>('PATCH', `/notes/rooms/${slug}/`, { content }),
}
