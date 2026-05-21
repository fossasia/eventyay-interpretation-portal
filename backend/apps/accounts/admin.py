from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "display_name", "is_staff", "created_at"]
    fieldsets = BaseUserAdmin.fieldsets + (  # type: ignore[operator]
        ("Profile", {"fields": ("display_name", "avatar", "bio")}),
    )
