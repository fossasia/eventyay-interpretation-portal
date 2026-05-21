from __future__ import annotations

from django.urls import re_path

from .consumers import StudioConsumer

websocket_urlpatterns = [
    re_path(r"ws/studio/(?P<room_slug>[\w-]+)/$", StudioConsumer.as_asgi()),
]
