# MediaMTX Configuration Reference

Complete breakdown of every parameter in `mediamtx.yml` used by the Eventyay
Interpretation Portal. Each setting links to the upstream documentation and
explains **why** it is set to its current value.

> **Upstream docs:** [MediaMTX GitHub](https://github.com/bluenviron/mediamtx) ·
> [Full config reference](https://github.com/bluenviron/mediamtx/blob/main/mediamtx.yml) ·
> [WHIP docs](https://github.com/bluenviron/mediamtx#publish-to-the-server-1) ·
> [WHEP docs](https://github.com/bluenviron/mediamtx#read-from-the-server-1) ·
> [HLS docs](https://github.com/bluenviron/mediamtx#hls) ·
> [Control API docs](https://github.com/bluenviron/mediamtx#control-api)

---

## Architecture role

MediaMTX is the **media server** in the interpretation stack. It handles:

1. **WHIP ingest** — receives interpreter audio from the browser via WebRTC
2. **WHEP playback** — serves audio to listener browsers via WebRTC (primary, <1s latency)
3. **HLS fallback** — serves audio as HLS segments for maximum compatibility (~3s latency)
4. **Control API** — REST API for dynamic path management (alwaysAvailable, etc.)

```
Interpreter browser ──WHIP POST──▶ MediaMTX :8889 ──WHEP──▶ Listener browser (primary)
                                         │
                                         └──HLS──▶ Listener browser (fallback)
                                         │
                        FastAPI :8000 ──REST──▶ Control API :9997 (path management)
```

Python **never** touches audio data. MediaMTX handles all media processing.

---

## Section-by-section breakdown

### Logging

```yaml
logLevel: info           # debug | info | warn | error
logDestinations: [stdout]
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `logLevel` | `info` | Controls verbosity. Use `debug` when troubleshooting WHIP/WHEP connections. Use `warn` in production to reduce noise. |
| `logDestinations` | `[stdout]` | Where logs go. `stdout` works with `docker compose logs`. Can also be `file` with `logFile` parameter. |

> **Ref:** [Logging section](https://github.com/bluenviron/mediamtx#logging)

---

### WebRTC / WHIP / WHEP

```yaml
webrtcAddress: :8889
webrtcEncryption: no
webrtcLocalUDPAddress: :8189
webrtcAdditionalHosts:
  - 127.0.0.1
webrtcAllowOrigins: ['*']
```

| Parameter | Value | Purpose | Production override |
|-----------|-------|---------|---------------------|
| `webrtcAddress` | `:8889` | TCP port for WHIP (publish) and WHEP (subscribe) HTTP signaling. Both use the same port — the endpoint path (`/whip` vs `/whep`) determines the direction. | Keep as-is behind Caddy |
| `webrtcEncryption` | `no` | Disables DTLS-SRTP (per-packet media encryption). **This is NOT HTTPS** — it controls whether RTP packets inside the WebRTC tunnel are encrypted. Set to `no` for local dev to avoid self-signed certificate issues. | **Must be `yes` in production** |
| `webrtcLocalUDPAddress` | `:8189` | Pins all ICE/RTP traffic to a single UDP port. Without this, MediaMTX uses random ephemeral ports (e.g., 49152–65535), making Docker port-forwarding impossible. | Keep as-is |
| `webrtcAdditionalHosts` | `[127.0.0.1]` | Extra IPs to include in SDP answer ICE candidates. Inside Docker, MediaMTX auto-detects only its container IP (e.g., `172.17.0.3`), which browsers on the host can't reach. Adding `127.0.0.1` lets the browser connect via Docker port-forwarding. | **Replace with your server's public IP** |
| `webrtcAllowOrigins` | `['*']` | CORS origins allowed to POST WHIP/WHEP offers. The portal JS on `:8000` needs to POST to `:8889` (cross-origin). **Note:** Plural form `webrtcAllowOrigins` required by MediaMTX ≥ 1.18 (the old singular `webrtcAllowOrigin` is deprecated). | Restrict to your domain |

#### WHIP flow (interpreter publishes)

```
Browser → POST http://host:8889/{channel}/whip
          Content-Type: application/sdp
          Body: SDP offer (sendonly)
       ← 201 Created
          Content-Type: application/sdp
          Location: /{channel}/whip/{session-id}
          Body: SDP answer
Browser → UDP :8189 (RTP/Opus packets flow)
```

#### WHEP flow (listener receives)

```
Browser → POST http://host:8889/{channel}/whep
          Content-Type: application/sdp
          Body: SDP offer (recvonly)
       ← 201 Created
          Content-Type: application/sdp
          Location: /{channel}/whep/{session-id}
          Body: SDP answer
Browser ← UDP :8189 (RTP/Opus packets received, <1s latency)
```

> **Ref:** [WebRTC section](https://github.com/bluenviron/mediamtx#webrtc) ·
> [WHIP publish](https://github.com/bluenviron/mediamtx#publish-to-the-server-1) ·
> [WHEP read](https://github.com/bluenviron/mediamtx#read-from-the-server-1)

---

### HLS output (fallback)

```yaml
hlsAddress: :8888
hlsEncryption: no
hlsAllowOrigins: ['*']
hlsAlwaysRemux: yes
hlsSegmentDuration: 1s
hlsSegmentMaxSize: 50MB
# hlsPartDuration: 200ms   # uncomment to enable LL-HLS (post-MVP)
```

| Parameter | Value | Purpose | Production override |
|-----------|-------|---------|---------------------|
| `hlsAddress` | `:8888` | TCP port for serving `.m3u8` playlists and `.ts` segments. | Keep as-is behind Caddy |
| `hlsEncryption` | `no` | Disables HTTPS on the HLS server. In production, Caddy handles TLS termination. | Handled by Caddy |
| `hlsAllowOrigins` | `['*']` | CORS for HLS responses. Portal JS on `:8000` fetches playlists from `:8888`. **Note:** Plural form required by MediaMTX ≥ 1.18. | Restrict to your domain |
| `hlsAlwaysRemux` | `yes` | Forces Opus → AAC transcoding before HLS packaging. WebRTC uses Opus; Apple's HLS ecosystem (Safari, iOS) requires AAC. Without this, iPhones can't hear anything. | Keep `yes` |
| `hlsSegmentDuration` | `1s` | Each `.ts` segment contains 1 second of audio. hls.js buffers 3 segments, giving ~3s end-to-end latency. Shorter = lower latency, more HTTP requests. | Consider `500ms` for lower latency |
| `hlsSegmentMaxSize` | `50MB` | Safety cap per segment. Prevents runaway memory usage if a segment isn't flushed correctly. | Keep as-is |
| `hlsPartDuration` | *(commented)* | Enables Low-Latency HLS (LL-HLS). Each 1s segment is served in 200ms parts as they complete, reducing buffer from ~3s to ~600ms. Deferred — WHEP is now the primary low-latency path. | Enable if LL-HLS is desired for HLS path |

#### HLS playlist format

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:1           ← max segment duration
#EXT-X-MEDIA-SEQUENCE:42          ← first segment in window

#EXTINF:1.000000,
segment42.ts
#EXTINF:1.000000,
segment43.ts
#EXTINF:1.000000,
segment44.ts
                                  ← NO #EXT-X-ENDLIST = stream is live
```

> **Ref:** [HLS section](https://github.com/bluenviron/mediamtx#hls) ·
> [LL-HLS](https://github.com/bluenviron/mediamtx#low-latency-mode)

---

### Authentication

```yaml
authMethod: internal
authInternalUsers:
  - user: any
    pass:
    ips: []
    permissions:
      - action: publish
        path:
      - action: read
        path:
      - action: playback
        path:
  - user: any
    pass:
    ips: []
    permissions:
      - action: api
```

| Parameter | Value | Purpose | Production override |
|-----------|-------|---------|---------------------|
| `authMethod` | `internal` | Uses MediaMTX's built-in user system. Alternatives: `http` (external auth server) or `jwt`. | Consider `http` to delegate auth to FastAPI |
| `authInternalUsers[0]` | any user, publish+read+playback | Allows any browser to publish WHIP and read WHEP/HLS without credentials. The portal's booth state enforces who can publish (only the active interpreter). | **Restrict `publish` to specific paths or passwords** |
| `authInternalUsers[1]` | any user, api | Allows Control API access from any IP. Needed because Docker port-forwarding routes requests from the bridge IP, not `127.0.0.1`. | **Restrict `ips` to FastAPI container IP** |

#### Why API access from any IP?

By default, MediaMTX restricts `api` actions to `127.0.0.1` only. Inside Docker,
requests from the host or from other containers arrive from the Docker bridge IP
(e.g., `172.17.0.1`), which MediaMTX rejects. Adding an explicit `api` permission
with `ips: []` (any IP) resolves this.

> **Ref:** [Authentication section](https://github.com/bluenviron/mediamtx#authentication)

---

### Control API

```yaml
api: true
apiAddress: :9997
```

| Parameter | Value | Purpose | Production override |
|-----------|-------|---------|---------------------|
| `api` | `true` | Enables the REST API for dynamic configuration. FastAPI uses this to create named paths with `alwaysAvailable: true`. | Keep `true` |
| `apiAddress` | `:9997` | TCP port for the Control API. | Keep as-is, restrict access via auth |

#### Key API endpoints used by FastAPI

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/v3/config/paths/add/{name}` | Create a named path with specific settings |
| `PATCH` | `/v3/config/paths/edit/{name}` | Update settings on an existing path |
| `GET` | `/v3/paths/list` | List all active paths and their state |

#### Dynamic path creation flow

FastAPI calls the Control API on first interpreter/listener access to a booth:

```python
# fastapi_app.py — _ensure_mediamtx_path()
async def _ensure_mediamtx_path(channel_id: str) -> None:
    """Create a named path with alwaysAvailable via MediaMTX Control API."""
    url = f"{settings.mediamtx_api_base}/v3/config/paths/add/{channel_id}"
    payload = {"name": channel_id, "alwaysAvailable": True}
    resp = httpx.post(url, json=payload)
    if resp.status_code == 409:  # already exists
        # PATCH to ensure alwaysAvailable is set
        httpx.patch(f".../v3/config/paths/edit/{channel_id}", json=payload)
```

> **Ref:** [Control API docs](https://github.com/bluenviron/mediamtx#control-api) ·
> [API reference](https://github.com/bluenviron/mediamtx#api-1)

---

### Path defaults

```yaml
pathDefaults:
  record: no
  overridePublisher: yes
```

| Parameter | Value | Purpose | Production override |
|-----------|-------|---------|---------------------|
| `record` | `no` | Disables on-disk recording of streams. Can be enabled for archiving. | Enable if recording is needed |
| `overridePublisher` | `yes` | **Critical for interpreter handoff.** When a new WHIP publisher connects to a path that already has one, MediaMTX kicks the old publisher and accepts the new one atomically (~50ms). Without this, new publishers get `409 Conflict` and handoff takes 2–5s. | Keep `yes` |

#### Why `alwaysAvailable` is NOT in pathDefaults

`alwaysAvailable: true` cannot be set in `pathDefaults` or on the `all_others`
wildcard path. MediaMTX rejects it with:

> *"cannot be used in a path with a regular expression (or path 'all')"*

This is why FastAPI creates **named paths** via the Control API — named paths
accept `alwaysAvailable`. Named paths take precedence over `all_others`.

> **Ref:** [Path configuration](https://github.com/bluenviron/mediamtx#path-configuration)

---

### Wildcard path

```yaml
paths:
  all_others:
```

| Parameter | Purpose |
|-----------|---------|
| `all_others` | Wildcard entry that allows any path to be auto-created on first WHIP publish. Without this, MediaMTX v1.x returns `400 "path not configured"`. Named paths (created via Control API) take precedence over this wildcard. |

> **Ref:** [all_others path](https://github.com/bluenviron/mediamtx#path-configuration)

---

## Port summary

| Port | Protocol | Direction | Service | Docker mapping |
|------|----------|-----------|---------|----------------|
| 8889 | TCP | Browser → MediaMTX | WHIP signaling (publish) + WHEP signaling (subscribe) | `8889:8889` |
| 8189 | UDP | Browser ↔ MediaMTX | ICE/RTP audio packets (both WHIP and WHEP) | `8189:8189/udp` |
| 8888 | TCP | Browser → MediaMTX | HLS playlists and segments (fallback) | `8888:8888` |
| 9997 | TCP | FastAPI → MediaMTX | Control API (path management) | `9997:9997` |

---

## Production checklist

| Setting | Dev value | Production value | Impact |
|---------|-----------|------------------|--------|
| `webrtcEncryption` | `no` | `yes` | Enables DTLS-SRTP media encryption |
| `webrtcAdditionalHosts` | `[127.0.0.1]` | `[YOUR_PUBLIC_IP]` | Browsers connect via public IP |
| `webrtcAllowOrigins` | `['*']` | `['https://portal.domain.com']` | Restrict CORS |
| `hlsAllowOrigins` | `['*']` | `['https://portal.domain.com']` | Restrict CORS |
| `authInternalUsers[api].ips` | `[]` (any) | `['172.17.0.0/16']` | Restrict API to Docker network |
| `authInternalUsers[publish].pass` | *(empty)* | `<strong-password>` | Authenticate WHIP publishers |
| `hlsPartDuration` | *(commented)* | `200ms` | Enable LL-HLS if HLS path needs <2s latency |

---

## Deprecated parameters (MediaMTX ≥ 1.18)

These parameters were renamed. Using the old names causes warnings or errors:

| Old name (deprecated) | New name | Notes |
|----------------------|----------|-------|
| `webrtcAllowOrigin` | `webrtcAllowOrigins` | Singular → plural |
| `hlsAllowOrigin` | `hlsAllowOrigins` | Singular → plural |
| `webrtcICEUDPMuxAddress` | `webrtcLocalUDPAddress` | Renamed in 1.18 |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| WHIP POST returns 400 | Path not configured | Ensure `all_others` exists in `paths:` |
| WHEP POST returns 404 | No publisher on path | Ensure path has `alwaysAvailable: true` (via Control API) |
| WebRTC connection fails (ICE timeout) | Browser can't reach MediaMTX UDP | Add your IP to `webrtcAdditionalHosts`, open port 8189/udp |
| `alwaysAvailable` error on startup | Set on pathDefaults or all_others | Only set via Control API on named paths |
| HLS silent on iPhone/Safari | Missing Opus→AAC transcode | Ensure `hlsAlwaysRemux: yes` |
| CORS error on WHIP/WHEP POST | Origin not allowed | Check `webrtcAllowOrigins` |
| API 401 from Docker | Bridge IP rejected | Add `api` permission with `ips: []` |
