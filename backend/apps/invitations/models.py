from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Invitation(models.Model):
    """A tokenized invite link for a room."""

    ROLE_MODERATOR = "moderator"
    ROLE_PARTICIPANT = "participant"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = [
        (ROLE_MODERATOR, "Moderator"),
        (ROLE_PARTICIPANT, "Participant"),
        (ROLE_VIEWER, "Viewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        "rooms.Room", on_delete=models.CASCADE, related_name="invitations"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_invitations",
    )
    token = models.CharField(max_length=64, unique=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PARTICIPANT)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    use_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "invitations_invitation"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Invite to {self.room} as {self.role}"

    def save(self, *args, **kwargs) -> None:  # type: ignore[override]
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_uses is not None and self.use_count >= self.max_uses:
            return False
        return True
