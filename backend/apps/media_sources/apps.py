from __future__ import annotations

from django.apps import AppConfig


class MediaSourcesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.media_sources"
    verbose_name = "Media Sources"
