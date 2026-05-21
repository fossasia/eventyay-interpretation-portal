from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from .rbac import ROLE_CHOICES, ROLE_ROOM_CREATOR, get_default_permissions


class Room(models.Model):
    """A studio room / broadcast session."""

    LAYOUT_SINGLE = "single"
    LAYOUT_SIDE_BY_SIDE = "side_by_side"
    LAYOUT_GRID = "grid"
    LAYOUT_PRESENTATION = "presentation"
    LAYOUT_CHOICES = [
        (LAYOUT_SINGLE, "Single"),
        (LAYOUT_SIDE_BY_SIDE, "Side by Side"),
        (LAYOUT_GRID, "Grid"),
        (LAYOUT_PRESENTATION, "Presentation"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_rooms",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    default_layout = models.CharField(
        max_length=30, choices=LAYOUT_CHOICES, default=LAYOUT_GRID
    )
    # Per-room feature toggles (e.g. allow_viewer_chat, allow_participant_screen_share)
    settings_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms_room"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:  # type: ignore[override]
        if not self.slug:
            base = slugify(self.name)
            slug = base
            counter = 1
            while Room.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class RoomMembership(models.Model):
    """Tracks a user's role and permissions within a room."""

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_memberships",
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="participant")
    # Stores per-membership permission overrides; merged with role defaults at runtime
    permissions = models.JSONField(default=dict, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms_membership"
        unique_together = [("room", "user")]

    def __str__(self) -> str:
        return f"{self.user} — {self.role} in {self.room}"

    def save(self, *args, **kwargs) -> None:  # type: ignore[override]
        if not self.permissions:
            self.permissions = get_default_permissions(self.role)
        super().save(*args, **kwargs)


class Stage(models.Model):
    """The broadcast stage for a room. Each room has exactly one stage."""

    LAYOUT_CHOICES = Room.LAYOUT_CHOICES

    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name="stage")
    layout = models.CharField(max_length=30, choices=LAYOUT_CHOICES, default=Room.LAYOUT_GRID)
    is_live = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms_stage"

    def __str__(self) -> str:
        return f"Stage — {self.room}"


class StageParticipant(models.Model):
    """A user that has been placed on stage by a moderator."""

    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stage_appearances",
    )
    position = models.PositiveIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    is_spotlighted = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    camera_off = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stage_additions",
    )

    class Meta:
        db_table = "rooms_stage_participant"
        unique_together = [("stage", "user")]
        ordering = ["position", "added_at"]

    def __str__(self) -> str:
        return f"{self.user} on {self.stage}"
