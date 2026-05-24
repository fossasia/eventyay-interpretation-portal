from __future__ import annotations

from fastapi.testclient import TestClient

from fastapi_app import app

client = TestClient(app)


def test_healthz_returns_ok():
    response = client.get('/healthz')

    assert response.status_code == 200
    data = response.json()
    assert data['ok'] is True
    assert data['server'] == 'fastapi'
    assert 'use_legacy_ingest' in data


def test_ws_booth_echo():
    with client.websocket_connect('/ws/booth/test-room') as ws:
        ws.send_text('hello')
        reply = ws.receive_text()

    assert 'test-room' in reply
    assert 'echo' in reply
    assert 'hello' in reply


def test_ws_booth_multiple_messages():
    with client.websocket_connect('/ws/booth/demo') as ws:
        for msg in ('ping', 'check', 'ready'):
            ws.send_text(msg)
            reply = ws.receive_text()
            assert msg in reply
            assert 'demo' in reply
