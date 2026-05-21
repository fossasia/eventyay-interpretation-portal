from __future__ import annotations

"""WSGI config — for traditional WSGI servers (gunicorn, uWSGI)."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = get_wsgi_application()
