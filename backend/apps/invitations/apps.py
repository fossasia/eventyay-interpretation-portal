from __future__ import annotations

from django.apps import AppConfig


class InvitationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.invitations"
    verbose_name = "Invitations"
