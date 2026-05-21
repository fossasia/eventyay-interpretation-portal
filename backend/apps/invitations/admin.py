from __future__ import annotations

from django.contrib import admin

from .models import Invitation


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ["room", "role", "created_by", "is_active", "use_count", "expires_at", "created_at"]
    list_filter = ["role", "is_active"]
