from __future__ import annotations

from django.urls import path

from .views import MediaSourceActivateView, MediaSourceDetailView, MediaSourceListCreateView

urlpatterns = [
    path("rooms/<slug:slug>/", MediaSourceListCreateView.as_view(), name="media-list-create"),
    path("rooms/<slug:slug>/<uuid:media_id>/", MediaSourceDetailView.as_view(), name="media-detail"),
    path("rooms/<slug:slug>/<uuid:media_id>/activate/", MediaSourceActivateView.as_view(), name="media-activate"),
]
