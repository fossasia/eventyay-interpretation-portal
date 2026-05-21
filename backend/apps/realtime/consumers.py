from __future__ import annotations

"""
WebSocket consumers for the studio platform.

Each room has a single channel group: studio_{room_slug}

All authenticated users who join the room connect to this group.
The consumer dispatches typed events for stage control, chat, media,
streaming status, WebRTC signalling, and participant presence.
"""

import json
import logging
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


def studio_group(room_slug: str) -> str:
    return f"studio_{room_slug}"


class StudioConsumer(AsyncWebsocketConsumer):
    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        self.room_slug: str = self.scope["url_route"]["kwargs"]["room_slug"]
        self.group_name: str = studio_group(self.room_slug)
        self.user = self.scope.get("user")

        if self.user is None or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify membership
        is_member = await self._is_member()
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Broadcast presence event
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "participant.joined",
                "user_id": self.user.pk,
                "display_name": str(self.user),
            },
        )

    async def disconnect(self, close_code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "participant.left",
                    "user_id": getattr(self.user, "pk", None),
                    "display_name": str(getattr(self.user, "", "")),
                },
            )
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ------------------------------------------------------------------
    # Receive from client
    # ------------------------------------------------------------------

    async def receive(self, text_data: str) -> None:
        try:
            data: dict[str, Any] = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON")
            return

        event_type: str = data.get("type", "")
        payload: dict = data.get("payload", {})

        handlers = {
            "chat.send": self._handle_chat_send,
            "stage.add_participant": self._handle_stage_add,
            "stage.remove_participant": self._handle_stage_remove,
            "stage.mute": self._handle_stage_mute,
            "stage.pin": self._handle_stage_pin,
            "stage.spotlight": self._handle_stage_spotlight,
            "participant.raise_hand": self._handle_raise_hand,
            "participant.lower_hand": self._handle_lower_hand,
            "stream.status_changed": self._handle_stream_status,
            "media.switch": self._handle_media_switch,
            "note.update": self._handle_note_update,
            "webrtc.offer": self._handle_webrtc_offer,
            "webrtc.answer": self._handle_webrtc_answer,
            "webrtc.ice_candidate": self._handle_webrtc_ice,
        }

        handler = handlers.get(event_type)
        if handler is None:
            await self._send_error(f"Unknown event type: {event_type}")
            return

        try:
            await handler(payload)
        except PermissionError as exc:
            await self._send_error(str(exc))
        except Exception as exc:
            logger.exception("Error handling %s: %s", event_type, exc)
            await self._send_error("Internal error.")

    # ------------------------------------------------------------------
    # Event handlers (client → server)
    # ------------------------------------------------------------------

    async def _handle_chat_send(self, payload: dict) -> None:
        body = str(payload.get("body", "")).strip()
        if not body:
            return
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "user_id": self.user.pk,
                "display_name": str(self.user),
                "body": body,
            },
        )

    async def _handle_stage_add(self, payload: dict) -> None:
        await self._require_permission("stage.add_participant")
        target_user_id = payload.get("user_id")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stage.updated",
                "action": "add",
                "target_user_id": target_user_id,
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_stage_remove(self, payload: dict) -> None:
        await self._require_permission("stage.remove_participant")
        target_user_id = payload.get("user_id")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stage.updated",
                "action": "remove",
                "target_user_id": target_user_id,
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_stage_mute(self, payload: dict) -> None:
        await self._require_permission("stage.mute")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stage.updated",
                "action": "mute",
                "target_user_id": payload.get("user_id"),
                "muted": payload.get("muted", True),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_stage_pin(self, payload: dict) -> None:
        await self._require_permission("stage.pin")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stage.updated",
                "action": "pin",
                "target_user_id": payload.get("user_id"),
                "pinned": payload.get("pinned", True),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_stage_spotlight(self, payload: dict) -> None:
        await self._require_permission("stage.spotlight")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stage.updated",
                "action": "spotlight",
                "target_user_id": payload.get("user_id"),
                "spotlighted": payload.get("spotlighted", True),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_raise_hand(self, payload: dict) -> None:
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "participant.updated",
                "user_id": self.user.pk,
                "hand_raised": True,
            },
        )

    async def _handle_lower_hand(self, payload: dict) -> None:
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "participant.updated",
                "user_id": self.user.pk,
                "hand_raised": False,
            },
        )

    async def _handle_stream_status(self, payload: dict) -> None:
        await self._require_permission("streaming.control")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "stream.status_changed",
                "status": payload.get("status"),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_media_switch(self, payload: dict) -> None:
        await self._require_permission("media.manage")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "media.updated",
                "media_id": payload.get("media_id"),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_note_update(self, payload: dict) -> None:
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "note.updated",
                "content": payload.get("content", ""),
                "by_user_id": self.user.pk,
            },
        )

    async def _handle_webrtc_offer(self, payload: dict) -> None:
        """Relay a WebRTC offer to a specific peer."""
        target_channel = payload.get("target_channel")
        if not target_channel:
            return
        await self.channel_layer.send(
            target_channel,
            {
                "type": "webrtc.offer",
                "from_user_id": self.user.pk,
                "sdp": payload.get("sdp"),
            },
        )

    async def _handle_webrtc_answer(self, payload: dict) -> None:
        target_channel = payload.get("target_channel")
        if not target_channel:
            return
        await self.channel_layer.send(
            target_channel,
            {
                "type": "webrtc.answer",
                "from_user_id": self.user.pk,
                "sdp": payload.get("sdp"),
            },
        )

    async def _handle_webrtc_ice(self, payload: dict) -> None:
        target_channel = payload.get("target_channel")
        if not target_channel:
            return
        await self.channel_layer.send(
            target_channel,
            {
                "type": "webrtc.ice_candidate",
                "from_user_id": self.user.pk,
                "candidate": payload.get("candidate"),
            },
        )

    # ------------------------------------------------------------------
    # Group → client message dispatchers
    # ------------------------------------------------------------------

    async def participant_joined(self, event: dict) -> None:
        await self._send(event)

    async def participant_left(self, event: dict) -> None:
        await self._send(event)

    async def participant_updated(self, event: dict) -> None:
        await self._send(event)

    async def chat_message(self, event: dict) -> None:
        await self._send(event)

    async def stage_updated(self, event: dict) -> None:
        await self._send(event)

    async def stream_status_changed(self, event: dict) -> None:
        await self._send(event)

    async def media_updated(self, event: dict) -> None:
        await self._send(event)

    async def note_updated(self, event: dict) -> None:
        await self._send(event)

    async def webrtc_offer(self, event: dict) -> None:
        await self._send(event)

    async def webrtc_answer(self, event: dict) -> None:
        await self._send(event)

    async def webrtc_ice_candidate(self, event: dict) -> None:
        await self._send(event)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _send(self, data: dict) -> None:
        await self.send(text_data=json.dumps(data))

    async def _send_error(self, message: str) -> None:
        await self.send(text_data=json.dumps({"type": "room.error", "message": message}))

    async def _require_permission(self, perm: str) -> None:
        allowed = await self._check_permission(perm)
        if not allowed:
            raise PermissionError(f"You do not have the '{perm}' permission.")

    @database_sync_to_async
    def _is_member(self) -> bool:
        from apps.rooms.models import RoomMembership
        return RoomMembership.objects.filter(
            room__slug=self.room_slug, user=self.user
        ).exists()

    @database_sync_to_async
    def _check_permission(self, perm: str) -> bool:
        from apps.rooms.models import RoomMembership
        from apps.rooms.rbac import has_permission
        try:
            membership = RoomMembership.objects.get(room__slug=self.room_slug, user=self.user)
            return has_permission(membership, perm)
        except RoomMembership.DoesNotExist:
            return False
