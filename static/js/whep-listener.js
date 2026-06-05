/**
 * WHEP Listener — WebRTC playback client for MediaMTX.
 *
 * Connects to a MediaMTX WHEP endpoint and plays the received audio track
 * through an HTML <audio> element.  Displays connection state, ICE state,
 * and audio-track information for debugging.
 *
 * Usage (from the template):
 *   WhepListener.start({ whepUrl, audioEl, onState, onLog })
 */
'use strict';

function createWhepClient() {

  /** @type {RTCPeerConnection|null} */
  let pc = null;
  /** @type {string|null} WHEP resource URL returned via Location header */
  let resourceUrl = null;
  /** @type {number|null} */
  let reconnectTimer = null;
  /** Exponential back-off delay (ms). */
  let reconnectDelay = 100;

  // Callbacks supplied by caller.
  let _onState = () => {};
  let _onLog   = () => {};
  let _whepUrl = '';
  let _audioEl = null;

  // ── helpers ────────────────────────────────────────────────────────────

  function log(msg) {
    _onLog(msg);
  }

  function emitState() {
    _onState({
      peerConnection: pc ? pc.connectionState : 'closed',
      ice:            pc ? pc.iceConnectionState : 'closed',
      signaling:      pc ? pc.signalingState : 'closed',
      audioActive:    _audioEl ? !_audioEl.paused && _audioEl.srcObject !== null : false,
      whepUrl:        _whepUrl,
    });
  }

  // ── WHEP negotiation ──────────────────────────────────────────────────

  /**
   * Wait for ICE gathering to complete (or timeout).
   * Returns a promise that resolves when gathering is "complete" or after
   * the given timeout (whichever comes first).
   */
  function waitForIce(peerConn, timeoutMs) {
    return new Promise((resolve) => {
      if (peerConn.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, timeoutMs);
      peerConn.addEventListener('icegatheringstatechange', function handler() {
        if (peerConn.iceGatheringState === 'complete') {
          clearTimeout(timer);
          peerConn.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      });
    });
  }

  async function connect() {
    cleanup();

    log('Creating RTCPeerConnection...');
    pc = new RTCPeerConnection({
      iceServers: [],         // local-only, no STUN/TURN needed for dev
    });

    // We want to receive audio only.
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Attach incoming track to <audio>.
    pc.addEventListener('track', (event) => {
      log('Remote track received: kind=' + event.track.kind);
      if (event.track.kind === 'audio') {
        _audioEl.srcObject = event.streams[0] || new MediaStream([event.track]);
        _audioEl.play().catch((err) => log('Autoplay blocked: ' + err.message));
      }
      emitState();
    });

    // State change listeners.
    pc.addEventListener('connectionstatechange', () => {
      log('PeerConnection state: ' + pc.connectionState);
      emitState();
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        scheduleReconnect();
      }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      log('ICE state: ' + pc.iceConnectionState);
      emitState();
    });

    // Create offer.
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE candidates (100 ms — local dev needs no STUN).
    await waitForIce(pc, 100);

    const offerSdp = pc.localDescription.sdp;
    log('Sending WHEP offer to ' + _whepUrl);

    let response;
    try {
      response = await fetch(_whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offerSdp,
      });
    } catch (err) {
      log('WHEP fetch failed: ' + err.message);
      scheduleReconnect();
      return;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      log('WHEP error ' + response.status + ': ' + body);
      scheduleReconnect();
      return;
    }

    // Save resource URL for teardown.
    const location = response.headers.get('Location');
    if (location) {
      // Location may be relative or absolute.
      resourceUrl = new URL(location, _whepUrl).href;
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    reconnectDelay = 100;  // reset back-off on success
    log('WHEP session established');
    emitState();
  }

  // ── reconnect ──────────────────────────────────────────────────────────

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 1.5, 8000);
    log('Reconnecting in ' + (delay / 1000).toFixed(1) + 's...');
    emitState();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  // ── cleanup ────────────────────────────────────────────────────────────

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (resourceUrl) {
      // Best-effort DELETE to release the WHEP session on the server.
      fetch(resourceUrl, { method: 'DELETE' }).catch(() => {});
      resourceUrl = null;
    }

    if (pc) {
      pc.close();
      pc = null;
    }

    if (_audioEl) {
      _audioEl.srcObject = null;
    }
  }

  // ── public API ─────────────────────────────────────────────────────────

  return {
    /**
     * @param {object} opts
     * @param {string}          opts.whepUrl  – full WHEP endpoint URL
     * @param {HTMLAudioElement} opts.audioEl  – target audio element
     * @param {function}        opts.onState  – called with state object on changes
     * @param {function}        opts.onLog    – called with log string
     */
    start(opts) {
      _whepUrl = opts.whepUrl;
      _audioEl = opts.audioEl;
      _onState = opts.onState || (() => {});
      _onLog   = opts.onLog   || (() => {});
      connect();
    },

    /** Tear down the session. */
    stop() {
      cleanup();
      emitState();
    },
  };
}

const WhepListener = createWhepClient();
