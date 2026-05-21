from __future__ import annotations

from django.urls import path

from .views import StreamStartView, StreamStatusView, StreamStopView

urlpatterns = [
    path("rooms/<slug:slug>/status/", StreamStatusView.as_view(), name="stream-status"),
    path("rooms/<slug:slug>/start/", StreamStartView.as_view(), name="stream-start"),
    path("rooms/<slug:slug>/stop/", StreamStopView.as_view(), name="stream-stop"),
]
