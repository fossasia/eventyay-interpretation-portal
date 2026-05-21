from __future__ import annotations

from django.contrib import admin

from .models import Room, RoomMembership, Stage, StageParticipant


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "owner", "is_active", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name", "slug"]


@admin.register(RoomMembership)
class RoomMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "room", "role", "joined_at"]
    list_filter = ["role"]


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ["room", "layout", "is_live"]


@admin.register(StageParticipant)
class StageParticipantAdmin(admin.ModelAdmin):
    list_display = ["user", "stage", "is_pinned", "is_spotlighted", "is_muted"]
