from __future__ import annotations

from django.contrib import admin

from .models import StreamSession


@admin.register(StreamSession)
class StreamSessionAdmin(admin.ModelAdmin):
    list_display = ["room", "status", "destination", "started_by", "started_at", "ended_at"]
    list_filter = ["status", "destination"]
