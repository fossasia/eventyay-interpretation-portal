from __future__ import annotations

"""Development settings — never use in production."""

import os

from .base import *  # noqa: F401, F403

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-key-change-before-production")

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# ---------------------------------------------------------------------------
# Database — SQLite for local development
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "backend" / "db.sqlite3",  # noqa: F405
    }
}

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

# Django CSRF must trust the Vite dev-server origin so cross-origin POST
# requests (login, register) pass the Origin header check.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ---------------------------------------------------------------------------
# Email — print to console during development
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ---------------------------------------------------------------------------
# Channels — use in-memory layer when Redis is unavailable
# ---------------------------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# ---------------------------------------------------------------------------
# Django debug toolbar (optional)
# ---------------------------------------------------------------------------
INTERNAL_IPS = ["127.0.0.1"]
