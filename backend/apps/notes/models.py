from __future__ import annotations

from django.conf import settings
from django.db import models


class RoomNote(models.Model):
    """Collaborative note associated with a room. One note per room."""

    room = models.OneToOneField(
        "rooms.Room", on_delete=models.CASCADE, related_name="note"
    )
    content = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="note_updates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notes_roomnote"

    def __str__(self) -> str:
        return f"Notes — {self.room}"


class NoteRevision(models.Model):
    """Append-only history of note edits for audit / restore."""

    note = models.ForeignKey(RoomNote, on_delete=models.CASCADE, related_name="revisions")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="note_revisions",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notes_noterevision"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Revision of {self.note} at {self.created_at}"
