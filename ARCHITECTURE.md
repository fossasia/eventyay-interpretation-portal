# Eventyay Studio — Architecture

## Overview

Eventyay Studio is a browser-first live production platform modelled on StreamYard/Interprefy workflows. Moderators and participants conduct sessions entirely in the browser with no OBS or external encoder required.

---

## Stack

| Layer | Technology |
|---|---|
| Backend framework | Django 5 + Django REST Framework |
| Authentication | Django AllAuth (email/password + Google/GitHub OAuth) |
| Realtime | Django Channels 4 (ASGI/WebSocket) |
| Channel layer | Redis (production) / in-memory (development) |
| Database | PostgreSQL (production) / SQLite (development) |
| Frontend | React 18 + TypeScript + Vite |
| Media capture | Browser `getUserMedia`, `getDisplayMedia`, `MediaRecorder` |
| Peer connections | WebRTC (`RTCPeerConnection`) relayed via Channels |
| Streaming | YouTube Live via RTMP stream key (user-supplied) |

---

## Directory layout

```
backend/
  manage.py
  config/
    settings/
      base.py          — shared settings
      development.py   — SQLite + in-memory channels
      production.py    — PostgreSQL + Redis
    urls.py
    asgi.py            — Channels ASGI entrypoint
    wsgi.py
  apps/
    accounts/          — Custom User model, registration, login, AllAuth wiring
    rooms/             — Room, RoomMembership, Stage, StageParticipant + RBAC
    media_sources/     — MediaSource (PDFs, slides, images, video, YouTube)
    streaming/         — StreamSession (recording / YouTube Live)
    invitations/       — Tokenized invite links with role + expiry
    notes/             — Collaborative RoomNote with revision history
    realtime/          — StudioConsumer (WebSocket), routing

frontend/
  src/
    App.tsx
    context/AuthContext.tsx
    hooks/
      useStudio.ts             — central studio state + API calls
      useStudioWebSocket.ts
      useWebRTC.ts
    services/
      api.ts                   — typed fetch wrappers for all DRF endpoints
      websocket.ts             — StudioWebSocket (auto-reconnect)
    types/index.ts             — all shared TypeScript types
    pages/
      LoginPage.tsx
      RegisterPage.tsx
      DashboardPage.tsx
      StudioPage.tsx           — main studio shell
      InviteAcceptPage.tsx
    components/studio/
      StageArea.tsx            — central broadcast stage (layout-aware tile grid)
      ParticipantCard.tsx      — backstage card with hover "Add to stage" overlay
      SidebarPanel.tsx         — tabbed right sidebar
      ChatPanel.tsx
      MediaAssetsPanel.tsx
      PeoplePanel.tsx
      NotesPanel.tsx
      StreamControls.tsx       — Record / Go Live button + YouTube config
```

---

## RBAC model

| Role | Key capabilities |
|---|---|
| `room_creator` | All permissions. Cannot be demoted. |
| `moderator` | Stage control, mute, pin, spotlight, media, streaming, assign roles |
| `participant` | Chat, raise hand; mic/camera by default; screen share toggleable |
| `viewer` | Watch only; chat toggleable per room |

Permissions are stored as a JSON dict on `RoomMembership.permissions`. Role defaults are defined in `apps/rooms/rbac.py`. Custom overrides are merged at runtime by `has_permission()`.

---

## Studio flow

```
Open /studio/<slug>
  │
  ├── HTTP: load Room, Members, Stage, Media, Stream status, Notes
  ├── WS:  connect to ws/studio/<slug>/
  │
  ├── Backstage: all members visible as participant cards
  │     └── Moderator hovers → "Add to stage" overlay
  │           └── POST /api/rooms/<slug>/stage/add/ + ws stage.add_participant
  │
  ├── Stage: tile grid of StageParticipants
  │     ├── Moderator controls: mute, pin, spotlight, remove
  │     └── Layout: single / side_by_side / grid / presentation
  │
  └── Sidebar tabs: Chat | Media Assets | People | Notes | Invitations (mod only)
```

---

## WebSocket event protocol

All frames are JSON:

**Client → server:**
```json
{ "type": "stage.add_participant", "payload": { "user_id": 42 } }
```

**Server → client (broadcast):**
```json
{ "type": "stage.updated", "action": "add", "target_user_id": 42, "by_user_id": 1 }
```

Full event list: `chat.send`, `stage.{add_participant,remove_participant,mute,pin,spotlight}`,
`participant.{raise_hand,lower_hand}`, `stream.status_changed`, `media.switch`,
`note.update`, `webrtc.{offer,answer,ice_candidate}`.

---

## API summary

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/auth/profile/
PATCH  /api/auth/profile/

GET    /api/rooms/
POST   /api/rooms/
GET    /api/rooms/<slug>/
PATCH  /api/rooms/<slug>/
DELETE /api/rooms/<slug>/
POST   /api/rooms/<slug>/join/
DELETE /api/rooms/<slug>/leave/
GET    /api/rooms/<slug>/members/
PATCH  /api/rooms/<slug>/members/<id>/role/
DELETE /api/rooms/<slug>/members/<id>/remove/
GET    /api/rooms/<slug>/stage/
POST   /api/rooms/<slug>/stage/add/
PATCH  /api/rooms/<slug>/stage/<user_id>/
DELETE /api/rooms/<slug>/stage/<user_id>/

GET    /api/media/rooms/<slug>/
POST   /api/media/rooms/<slug>/
DELETE /api/media/rooms/<slug>/<id>/
POST   /api/media/rooms/<slug>/<id>/activate/

GET    /api/streaming/rooms/<slug>/status/
POST   /api/streaming/rooms/<slug>/start/
POST   /api/streaming/rooms/<slug>/stop/

GET    /api/invitations/rooms/<slug>/
POST   /api/invitations/rooms/<slug>/
DELETE /api/invitations/rooms/<slug>/<id>/
POST   /api/invitations/accept/<token>/

GET    /api/notes/rooms/<slug>/
PATCH  /api/notes/rooms/<slug>/
GET    /api/notes/rooms/<slug>/revisions/
```

---

## Running locally

### Backend

```bash
cd backend
cp .env.example .env          # fill in values
python manage.py migrate
python manage.py createsuperuser
daphne -p 8000 config.asgi:application
# Or for HTTP-only dev (no WebSockets):
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # Vite dev server on :5173 — proxies /api and /ws to :8000
```

---

## Production checklist

- Set `DJANGO_SETTINGS_MODULE=config.settings.production`
- Provide all environment variables
- Run `python manage.py migrate && python manage.py collectstatic`
- Start with `daphne` (ASGI) behind nginx
- Ensure Redis is running for Channels
- Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- Enable HTTPS (`SECURE_SSL_REDIRECT=True`)

---

## Migration from previous Flask/Vue architecture

The previous Flask + Vue 3 interpretation booth code lives in:
- `app.py`, `portal/` — Flask routes and SocketIO handlers
- `src/` (Vue 3 SPA)
- `static/`, `templates/` — server-rendered HTML

These are preserved for reference but are **not loaded by the new Django server**. They can be removed once the new platform is validated.

| Old feature | New equivalent |
|---|---|
| Basic access token auth | Django AllAuth (email/password + OAuth) |
| Flask-SocketIO booth events | Django Channels `StudioConsumer` |
| Jitsi iframe (monitoring) | Removed — native WebRTC stage |
| aiortc ingest | Browser `MediaRecorder` / YouTube RTMP |
| Vue 3 SPA (`src/`) | React + TypeScript (`frontend/src/`) |
