"""FastAPI entry point — Phase 1B: runs alongside Flask on a separate port.

Flask (app.py) keeps handling all Socket.IO events on port 5000.
This module validates that FastAPI can coexist and read shared config.

Phase 1C will port Socket.IO coordination here and remove Flask.

Start with:
    uvicorn fastapi_app:app --host 0.0.0.0 --port 8001 --reload
"""
from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from portal.config import settings

app = FastAPI(title='Eventyay Interpretation Portal', version='1.0.0')


@app.get('/healthz')
async def healthz() -> dict:
    return {
        'ok': True,
        'server': 'fastapi',
        'use_legacy_ingest': settings.use_legacy_ingest,
    }


@app.websocket('/ws/booth/{booth_id}')
async def ws_booth(websocket: WebSocket, booth_id: str) -> None:
    """Echo endpoint — Phase 1B validation only.

    Socket.IO coordination still targets Flask on port 5000.
    Full migration (replacing Flask-SocketIO) happens in Phase 1C.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f'booth:{booth_id} echo: {data}')
    except WebSocketDisconnect:
        pass
