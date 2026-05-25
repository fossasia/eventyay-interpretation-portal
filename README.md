# Eventyay Interpretation Portal

Real-time interpretation coordination for Eventyay events.
Interpreters stream live audio via WebRTC/WHIP → MediaMTX → HLS.
Booth coordination (who is active, relay handoff, chat) runs over WebSocket.

---

## How it works

```
Interpreter browser
  │  mic → RTCPeerConnection → WHIP POST
  ▼
MediaMTX :8889 (WHIP ingest)          Python is never in the audio path
  │  remux → HLS segments
  ▼
MediaMTX :8888 (HLS output) ←── attendees pull index.m3u8

Interpreter / Coordinator browser
  │  WebSocket /ws/booth/{booth_id}
  ▼
FastAPI portal :8000 (coordination, state, JWT, REST)
```

**Seamless interpreter handoff**: when the coordinator switches the active interpreter,
the outgoing interpreter mutes its mic tracks but keeps the WHIP session alive for
700 ms. MediaMTX never destroys the HLS muxer, so attendees see no 404 and need no
browser refresh. The incoming interpreter retries WHIP every 400 ms (up to 6
attempts) and connects cleanly once the outgoing side releases the path.

---

## Quick start (native)

**Requirements**: Python 3.13+, [uv](https://github.com/astral-sh/uv), [MediaMTX](https://github.com/bluenviron/mediamtx/releases)

```bash
# 1 — Start MediaMTX
./mediamtx   # uses mediamtx.yml

# 2 — Start the portal
uv sync
uv run uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
```

Open http://localhost:8000

### Environment

Copy `.env.example` → `.env` and adjust as needed:

```env
HOST=127.0.0.1
PORT=8000
SECRET_KEY=change-me
BOOTH_ACCESS_TOKEN=          # empty = no access control
JWT_SECRET=                  # empty = falls back to SECRET_KEY
MEDIAMTX_WHIP_BASE=http://localhost:8889
MEDIAMTX_HLS_BASE=http://localhost:8888
MEDIAMTX_INTERNAL_BASE=      # Docker: http://mediamtx:8888
```

---

## Docker Compose

```bash
docker compose up --build
# portal on :8000  |  MediaMTX HLS :8888  |  WHIP :8889
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Redirect to demo booth |
| `GET`  | `/interpreter/{booth_id}` | Interpreter booth UI |
| `POST` | `/api/auth/token` | Issue a signed JWT |
| `GET`  | `/api/booth/{booth_id}/state` | Current booth snapshot |
| `GET`  | `/api/interpreter/status/{channel_id}` | MediaMTX reachability |
| `GET`  | `/healthz` | Health check (`{"ok": true, "server": "fastapi"}`) |
| `WS`   | `/ws/booth/{booth_id}` | Booth coordination WebSocket |

### WebSocket protocol (client → server)

| Message type | Fields | Purpose |
|---|---|---|
| `booth:join` | `display_name`, `role`, `language`, `channel_id` | Enter a booth |
| `booth:leave` | — | Leave gracefully |
| `booth:update-state` | `mic_active`, `ingest_connected` | Report audio state |
| `booth:set-active` | `target_id` | Coordinator/active interp assigns new active |
| `booth:chat` | `body` | Send a message to all booth participants |

Server broadcasts `booth:state` to all connections on every state change.

---

## Development

```bash
uv sync --all-groups          # runtime + dev dependencies
uv run pytest tests/ -v       # 27 tests
node --check static/js/interpreter-booth.js   # JS syntax
```

### Project layout

```
fastapi_app.py                # FastAPI app — REST, WebSocket, Jinja2
portal/
  config.py                   # pydantic-settings (env vars / .env)
  auth.py                     # JWT issue / validate
  booth_state.py              # async in-memory booth registry
templates/
  base.html
  interpreter_booth.html      # Jinja2 template
static/
  js/interpreter-booth.js     # Plain browser JS — WebRTC/WHIP + WebSocket
  css/interpreter.css
mediamtx.yml                  # MediaMTX config (HLS 1 s segments, WHIP ingest)
docker-compose.yml            # portal + mediamtx services
Dockerfile                    # FastAPI container (uv, Python 3.13-slim)
tests/
  conftest.py
  test_fastapi_app.py         # REST + WebSocket integration tests
  test_booth_state.py         # booth registry unit tests
```

---

## Deployment

For production set strong secrets and point MediaMTX to your domain:

```env
SECRET_KEY=<random-256-bit>
BOOTH_ACCESS_TOKEN=<shared-secret-for-interpreters>
JWT_SECRET=<random-256-bit>
MEDIAMTX_WHIP_BASE=https://media.your-domain.com:8889
MEDIAMTX_HLS_BASE=https://media.your-domain.com:8888
MEDIAMTX_INTERNAL_BASE=http://mediamtx:8888   # internal Docker network
```


Run behind an HTTPS reverse proxy (nginx/Caddy). WebSocket upgrade must be proxied correctly.
MediaMTX WHIP endpoint must be accessible from interpreter browsers (HTTPS + CORS configured in `mediamtx.yml`).
