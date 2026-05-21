from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class StreamSession(models.Model):
    """Records a live streaming or recording session for a room."""

    STATUS_IDLE = "idle"
    STATUS_RECORDING = "recording"
    STATUS_LIVE = "live"
    STATUS_ENDED = "ended"
    STATUS_CHOICES = [
        (STATUS_IDLE, "Idle"),
        (STATUS_RECORDING, "Recording"),
        (STATUS_LIVE, "Live"),
        (STATUS_ENDED, "Ended"),
    ]

    DESTINATION_YOUTUBE = "youtube"
    DESTINATION_LOCAL = "local"
    DESTINATION_CHOICES = [
        (DESTINATION_YOUTUBE, "YouTube Live"),
        (DESTINATION_LOCAL, "Local Recording"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        "rooms.Room", on_delete=models.CASCADE, related_name="stream_sessions"
    )
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="started_streams",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IDLE)
    destination = models.CharField(
        max_length=20, choices=DESTINATION_CHOICES, default=DESTINATION_LOCAL
    )
    # YouTube specific
    stream_key = models.CharField(max_length=200, blank=True)
    youtube_broadcast_id = models.CharField(max_length=200, blank=True)
    youtube_stream_url = models.URLField(blank=True)
    # Recording
    recording_path = models.CharField(max_length=500, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "streaming_session"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.room} — {self.status}"
