# WHEP/WebRTC Listener — Testing Guide

This document describes how to test the WHEP/WebRTC listener, which is the
**primary** listener delivery path (replacing HLS as the default).

## Overview

| Path                            | Protocol     | Latency     | Role     |
| ------------------------------- | ------------ | ----------- | -------- |
| `/listener-webrtc/{booth_id}` | WHEP/WebRTC  | < 1 s       | Primary  |
| `/listen/{booth_id}`          | HLS (hls.js) | ~3-6 s      | Fallback |

Both pages coexist and can be opened simultaneously for side-by-side comparison.

### WHEP URL Format

MediaMTX serves WHEP on the same port as WHIP (`:8889`):

```
POST http://localhost:8889/{path}/whep
Content-Type: application/sdp
Body: SDP offer (recvonly)
→ 201 Created, body = SDP answer, Location = resource URL
```

Example for channel `demo-booth-audio`:

```
http://localhost:8889/demo-booth-audio/whep
```

---

## 1. Starting Services

```bash
cd eventyay-interpretation-portal

# Start MediaMTX
docker compose -f docker-compose.interpretation.yml up -d mediamtx

# Verify MediaMTX is running
docker compose -f docker-compose.interpretation.yml logs mediamtx | tail -5

# Start FastAPI server
uvicorn fastapi_app:app --host 0.0.0.0 --port 8000 --reload
```

Ports that must be available:

- **8000** — FastAPI portal
- **8888** — MediaMTX HLS output
- **8889** — MediaMTX WebRTC (WHIP + WHEP)
- **8189/udp** — MediaMTX ICE/UDP

---

## 2. Starting the Publisher (Interpreter)

1. Open the interpreter booth page:

   ```
   http://localhost:8000/interpreter/demo-booth
   ```
2. Enter a display name and click **Join Booth**.
3. Complete preflight checks (allow microphone).
4. Click **Go Live** to start WHIP publishing.
5. Confirm the Audio Status panel shows **"Streaming"**.

The interpreter is now publishing audio to MediaMTX at path `demo-booth-audio`.

---

## 3. Opening the WHEP Listener

Open a new browser tab:

```
http://localhost:8000/listener-webrtc/demo-booth
```

You should see:

- Status badge transitions: **Connecting...** → **Live (WebRTC)**
- Debug panel shows:
  - PeerConnection: `connected`
  - ICE: `connected`
  - Audio Active: `YES`
- Audio plays automatically through the `<audio>` element.

### Opening the HLS Listener (for comparison)

```
http://localhost:8000/listen/demo-booth
```

---

## 4. Multi-Tab Test

Open the following tabs simultaneously:

| Tab             | URL                                                  |
| --------------- | ---------------------------------------------------- |
| Publisher       | `http://localhost:8000/interpreter/demo-booth`     |
| WHEP Listener 1 | `http://localhost:8000/listener-webrtc/demo-booth` |
| WHEP Listener 2 | `http://localhost:8000/listener-webrtc/demo-booth` |
| WHEP Listener 3 | `http://localhost:8000/listener-webrtc/demo-booth` |
| WHEP Listener 4 | `http://localhost:8000/listener-webrtc/demo-booth` |
| WHEP Listener 5 | `http://localhost:8000/listener-webrtc/demo-booth` |

**Verify:**

- All 5 listener tabs show **Live (WebRTC)** status.
- All 5 listener tabs play audio simultaneously.
- Publisher shows **Streaming** in its Audio Status panel.

---

## 5. Latency Test

### Procedure

1. Ensure one publisher tab and one WHEP listener tab are open side by side.
2. In the publisher tab, speak slowly: **"one... two... three... four... five..."**
3. Listen to the WHEP listener tab's audio output.
4. Estimate the delay between speaking and hearing.

### Expected Results

| Protocol    | Expected Latency      |
| ----------- | --------------------- |
| HLS         | 6-10 seconds          |
| WHEP/WebRTC | < 500 ms (sub-second) |

### Optional: precise measurement

1. Open both HLS (`/listen/demo-booth`) and WHEP (`/listener-webrtc/demo-booth`).
2. Speak a sharp click or snap.
3. Compare when each listener plays the sound.
4. The WebRTC listener should be noticeably ahead of HLS.

---

## 6. Handoff Test

This tests what happens when the active interpreter switches.

### Setup

1. Open **Interpreter A** in one browser (or incognito window):

   ```
   http://localhost:8000/interpreter/demo-booth
   ```

   Join and Go Live.
2. Open **Interpreter B** in another browser (or incognito window):

   ```
   http://localhost:8000/interpreter/demo-booth
   ```

   Join (do NOT Go Live yet).
3. Open a WHEP listener:

   ```
   http://localhost:8000/listener-webrtc/demo-booth
   ```

   Confirm audio is playing from Interpreter A.

### Procedure

1. In Interpreter A's booth, set Interpreter B as active (via the participant list).
2. Observe the WHEP listener tab:
   - Does audio interrupt?
   - How quickly does audio from Interpreter B begin?
   - Does the PeerConnection state change?
   - Does the listener auto-reconnect?

### Record these observations

| Metric                       | Observation                                    |
| ---------------------------- | ---------------------------------------------- |
| Audio interruption duration  | __1___ seconds                           |
| PeerConnection state changes | (e.g., connected → disconnected → connected) |
| Auto-reconnect?              | yes / no                                       |
| Total time until recovery    | _____ seconds                                  |

### Compare with HLS

Repeat the same handoff test with the HLS listener at `/listen/demo-booth` and
record the HLS recovery time for comparison.

---

## 7. Troubleshooting

### WHEP returns 404

With `alwaysAvailable: true`, paths are created on first access and stay
alive even without a publisher. If you still get 404, restart the MediaMTX
container to reload the config:
```bash
docker compose -f docker-compose.interpretation.yml restart mediamtx
```

### Audio doesn't play (autoplay blocked)

Browsers may block autoplay. Click the play button on the `<audio>` element,
or interact with the page first (click anywhere).

### ICE state stays at "checking"

Verify that:

- Port **8189/udp** is published in Docker.
- `webrtcAdditionalHosts: [127.0.0.1]` is in `mediamtx.yml`.
- No firewall is blocking UDP on port 8189.

### CORS errors in console

Verify that `webrtcAllowOrigin: '*'` is set in `mediamtx.yml` and that the
MediaMTX container has been restarted after the config change.

---

## Notes

### MediaMTX WHEP Behavior

- WHEP is served on the same HTTP port as WHIP (`:8889`).
- Both use the WebRTC server built into MediaMTX.
- The WHEP endpoint for a path is `http://host:8889/{path}/whep`.
- With `alwaysAvailable: true`, paths exist before any publisher connects.
  WHEP readers receive silence until a publisher starts.
- MediaMTX handles Opus codec natively — no transcoding needed for WebRTC
  (unlike HLS which requires Opus → AAC via `hlsAlwaysRemux`).

### Handoff Behavior (with `alwaysAvailable`)

With `alwaysAvailable: true` + `overridePublisher: yes`, handoff is seamless:

1. Coordinator sets Interpreter B as active.
2. Interpreter A's browser mutes tracks and sends WHIP DELETE.
3. MediaMTX switches the path to the offline sub-stream (Opus silence).
   **WHEP readers stay connected** — their PeerConnection is not disrupted.
4. Interpreter B's browser starts WHIP publishing.
5. MediaMTX switches the path to B's audio.
6. WHEP readers immediately hear B's audio — no reconnection needed.

Source evidence (MediaMTX `internal/core/path.go`):
- `executeRemovePublisher()`: if `AlwaysAvailable`, calls
  `stream.StartOfflineSubStream()` instead of `setNotAvailable()`.
- `setNotAvailable()` (the old path) would close all readers and destroy
  the stream — this is what caused the 9-12s handoff delay.

### Expected Limitations

- **No codec negotiation UI** — the client always requests `recvonly` audio.
  If MediaMTX publishes video as well, the WHEP client ignores it.
- **Single UDP port** — all ICE traffic uses port 8189. This works for local
  dev but may need STUN/TURN for production NAT traversal.
- **No authentication on WHEP** — the current MediaMTX config allows anonymous
  reads. Production deployments should restrict via `authInternalUsers` or
  `authHTTPAddress`.
- **Reconnect as safety net** — `whep-listener.js` retries with 300ms backoff
  if the PeerConnection drops. With `alwaysAvailable`, this should rarely
  trigger during normal handoff.
