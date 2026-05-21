# Eventyay Studio — Agent Guide

This file defines implementation guardrails for contributors and coding agents.

Read this file in full before making changes. The constraints here are non-negotiable.

---

## Product intent

Build a **browser-first live production platform** for Eventyay events:

- **Studio-native** — no OBS, no RTMP encoder, no Jitsi
- **Collaborative** — moderators, participants, viewers with full RBAC
- **Extensible** — YouTube Live today, more destinations later
- **StreamYard/Interprefy-inspired** UX: large stage, backstage strip, tabbed sidebar

---

## Core design constraints

1. **No Jitsi.** Do not reintroduce Jitsi in any form.
2. **No OBS / RTMP ingest.** Streaming is handled via YouTube RTMP stream key entered by the user.
3. **No inline `<script>` blocks or jQuery.** Frontend is React + TypeScript only.
4. **Never route microphone audio to `AudioContext.destination`.**
5. **One active stream session per room** — enforced in `StreamSession` model and API.
6. **RBAC enforced on every mutating endpoint and WebSocket action.**

---

## Backend

| File / directory | Owns |
|---|---|
| `backend/config/` | Django project settings, URL routing, ASGI config |
| `backend/apps/accounts/` | Custom User model, registration, login, Django AllAuth wiring |
| `backend/apps/rooms/` | Room, RoomMembership, Stage, StageParticipant models + APIs |
| `backend/apps/rooms/rbac.py` | Role/permission constants + `has_permission()` resolver |
| `backend/apps/media_sources/` | MediaSource model + upload/activate APIs |
| `backend/apps/streaming/` | StreamSession model + start/stop APIs |
| `backend/apps/invitations/` | Tokenized invite links + accept endpoint |
| `backend/apps/notes/` | RoomNote + NoteRevision models + APIs |
| `backend/apps/realtime/` | `StudioConsumer` WebSocket consumer + routing |

### What agents must not do (backend)

- Do not replace `uv` with `pip` or `requirements.txt`.
- Do not change `uv.lock` without running `uv sync --python 3.13 --dev` and confirming tests pass.
- Do not import `pretix.*`, `pretalx.*`, or `venueless.*` namespaces.
- Do not add a second authentication system; AllAuth is the single source of truth.
- Do not bypass `has_permission()` in RBAC checks.
- Do not use synchronous ORM calls directly inside async consumers; use `database_sync_to_async`.

---

## Frontend

| File / directory | Owns |
|---|---|
| `frontend/src/context/AuthContext.tsx` | Auth state, login/logout/register |
| `frontend/src/hooks/useStudio.ts` | Central studio state machine, all API + WS wiring |
| `frontend/src/hooks/useStudioWebSocket.ts` | WebSocket lifecycle + event subscription |
| `frontend/src/hooks/useWebRTC.ts` | getUserMedia, screen share, device selection |
| `frontend/src/services/api.ts` | Typed fetch wrappers for all DRF endpoints |
| `frontend/src/services/websocket.ts` | `StudioWebSocket` class (auto-reconnect) |
| `frontend/src/types/index.ts` | All shared TypeScript types |
| `frontend/src/pages/StudioPage.tsx` | Main studio shell |
| `frontend/src/components/studio/` | All studio UI components |

### What agents must not do (frontend)

- No jQuery, no Options API Vue, no inline `<script>` blocks.
- Do not add a second state management library (no Redux, Zustand, etc.).
- Do not add a second client-side router.
- Do not route microphone audio to `AudioContext.destination`.

---

## Realtime event protocol

WebSocket URL: `ws/studio/<room_slug>/`

All frames are JSON: `{ "type": "...", "payload": { ... } }`

Permission checks in `StudioConsumer` mirror the REST API RBAC.

See `ARCHITECTURE.md` for the full event list.

---

## Validation before submitting changes

```bash
# Backend
cd backend
uv run pytest

# Frontend
cd frontend
npm run typecheck
npm run lint
```

---

## Dependency invariants

- Python runtime: `3.13.x`
- Django: `>=5.1,<6`
- `channels>=4.1` + `daphne>=4.1` for ASGI/WebSocket
- React `18.x` + TypeScript `5.x`
- `uv.lock` is the source of truth for all Python dependencies.

---

## Documentation requirements

When changing architecture or behavior, update:

- `README.md` for operational usage and setup
- `ARCHITECTURE.md` for design and flow changes
- this `agents.md` when contributor guardrails or invariants change
