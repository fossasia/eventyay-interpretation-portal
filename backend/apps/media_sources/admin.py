from __future__ import annotations

from django.contrib import admin

from .models import MediaSource


@admin.register(MediaSource)
class MediaSourceAdmin(admin.ModelAdmin):
    list_display = ["title", "source_type", "room", "uploaded_by", "is_active", "created_at"]
    list_filter = ["source_type", "is_active"]
    search_fields = ["title"]
