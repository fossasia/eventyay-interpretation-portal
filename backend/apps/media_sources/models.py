from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class MediaSource(models.Model):
    """A media asset associated with a room — file upload or external URL."""

    TYPE_PDF = "pdf"
    TYPE_SLIDES = "slides"
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_YOUTUBE = "youtube"
    TYPE_SCREEN = "screen"
    TYPE_WEBCAM = "webcam"

    SOURCE_TYPE_CHOICES = [
        (TYPE_PDF, "PDF Document"),
        (TYPE_SLIDES, "Slide Deck"),
        (TYPE_IMAGE, "Image"),
        (TYPE_VIDEO, "Video File"),
        (TYPE_YOUTUBE, "YouTube Video"),
        (TYPE_SCREEN, "Screen Share"),
        (TYPE_WEBCAM, "Webcam Feed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        "rooms.Room", on_delete=models.CASCADE, related_name="media_sources"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_media",
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    title = models.CharField(max_length=300)
    # Uploaded file (PDFs, images, video files, slide decks)
    file = models.FileField(upload_to="media_sources/", null=True, blank=True)
    # External URL (YouTube, screen share reference)
    url = models.URLField(blank=True)
    thumbnail = models.ImageField(upload_to="media_thumbnails/", null=True, blank=True)
    # Whether this source is currently active/on stage
    is_active = models.BooleanField(default=False)
    # Arbitrary metadata (duration, page count, resolution, etc.)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "media_sources_mediasource"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.source_type})"

    def save(self, *args, **kwargs) -> None:  # type: ignore[override]
        # Only one source can be active per room at a time
        if self.is_active:
            MediaSource.objects.filter(room=self.room, is_active=True).exclude(pk=self.pk).update(
                is_active=False
            )
        super().save(*args, **kwargs)
