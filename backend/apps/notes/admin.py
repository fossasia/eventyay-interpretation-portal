from __future__ import annotations

from django.contrib import admin

from .models import NoteRevision, RoomNote


@admin.register(RoomNote)
class RoomNoteAdmin(admin.ModelAdmin):
    list_display = ["room", "updated_by", "updated_at"]


@admin.register(NoteRevision)
class NoteRevisionAdmin(admin.ModelAdmin):
    list_display = ["note", "author", "created_at"]
    readonly_fields = ["note", "author", "content", "created_at"]
