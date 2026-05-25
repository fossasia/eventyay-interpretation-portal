# Eventyay Interpretation Portal

A real-time interpretation coordination portal for Eventyay events.
Interpreters stream audio via WebRTC/WHIP into MediaMTX; attendees listen via HLS.
Coordination (who is active, which booth, relay pass) runs over WebSocket.

---

## Architecture

```
Browser (interpreter)
  │  WebRTC/WHIP offer/answer
  ▼
MediaMTX :8889 (WHIP ingest)
  │  transcodes → HLS segments
  ▼
MediaMTX :8888 (HLS output)
  ▲
  │  listens on HLS stream
Browser (attendee)

Browser (interpreter/coordinator)
  │  WebSocket /ws/booth/{booth_id}
  ▼
FastAPI portal :8000
  │  in-memory booth state (asyncio)
  ▼
  broadcast to all booth participants
```

- **FastAPI + Uvicorn** — HTTP REST, Jinja2 templates, WebSocket
- **MediaMTX** — audio server; Python is never in the media path
- **No Flask, no Socket.IO, no aiortc**

---

## Quick start (native)

### Prerequisites

- Python 3.13+
- [uv](https://github.com/astral-sh/uv) package manager
- [MediaMTX](https://github.com/bluenviron/mediamtx/releases) binary

### 1 — Start MediaMTX

```bash
./mediamtx        # uses mediamtx.yml in repo root
```

### 2 — Install dependencies & start the portal

```bash
cd eventyay-interpretation-portal
uv sync
uv run uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
```

Open http://localhost:8000

### 3 — Environment

Copy `.env.example` to `.env` and adjust:

```env
HOST=127.0.0.1
PORT=8000
SECRET_KEY=change-me
BOOTH_ACCESS_TOKEN=        # empty = no access control
JWT_SECRET=                # empty = falls back to SECRET_KEY
MEDIAMTX_WHIP_BASE=http://localhost:8889
MEDIAMTX_HLS_BASE=http://localhost:8888
DEFAULT_JITSI_ROOM=https://meet.jit.si/eventyay-stage-room
JITSI_DOMAIN=meet.jit.si
```

---

## Docker Compose

```bash
docker compose up --build
```

This starts:
- `portal` — FastAPI app on port 8000
- `mediamtx` — audio server on ports 8888 (HLS) and 8889 (WHIP)

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Redirect to demo booth |
| `GET` | `/interpreter/{booth_id}` | Interpreter booth UI |
| `POST` | `/api/token` | Get a signed JWT |
| `GET` | `/api/booth/{booth_id}/state` | Current booth state |
| `GET` | `/api/interpreter/status/{channel_id}` | MediaMTX reachability check |
| `GET` | `/healthz` | Health check (JSON) |
| `WS` | `/ws/booth/{booth_id}` | Booth coordination WebSocket |

### WebSocket message types (client → server)

| Type | Purpose |
|------|---------|
| `booth:join` | Join a booth (interpreter or coordinator) |
| `booth:leave` | Leave gracefully |
| `booth:update-state` | Update mic/ingest status |
| `booth:set-active` | Coordinator assigns active interpreter |
| `booth:chat` | Send a text message to the booth |

---

## Development

### Run tests

```bash
uv run pytest tests/ -v
```

### Project layout

```
fastapi_app.py              # single FastAPI application entrypoint
portal/
  config.py                 # pydantic-settings Settings class
  auth.py                   # JWT create/validate helpers
  booth_state.py            # async in-memory booth registry
templates/
  interpreter_booth.html    # Jinja2 HTML template
static/
  js/interpreter-booth.js   # Alpine.js + WebRTC/WHIP + WebSocket
  css/
mediamtx.yml                # MediaMTX server configuration
docker-compose.yml          # portal + mediamtx services
Dockerfile                  # FastAPI container
tests/
  conftest.py
  test_fastapi_app.py
  test_booth_state.py
```

---

## Deployment

For production, set:

```env
SECRET_KEY=<strong-random-key>
BOOTH_ACCESS_TOKEN=<token-interpreters-must-provide>
JWT_SECRET=<strong-random-key>
MEDIAMTX_WHIP_BASE=https://media.your-domain.com:8889
MEDIAMTX_HLS_BASE=https://media.your-domain.com:8888
```

Run behind an HTTPS reverse proxy (nginx/Caddy). WebSocket upgrade must be proxied correctly.
MediaMTX WHIP endpoint must be accessible from interpreter browsers (HTTPS + CORS configured in `mediamtx.yml`).
