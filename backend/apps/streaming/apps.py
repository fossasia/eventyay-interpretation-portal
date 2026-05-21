from __future__ import annotations

from django.apps import AppConfig


class StreamingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.streaming"
    verbose_name = "Streaming"
