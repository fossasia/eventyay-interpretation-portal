from __future__ import annotations

from django.urls import path

from .views import NoteRevisionsView, RoomNoteView

urlpatterns = [
    path("rooms/<slug:slug>/", RoomNoteView.as_view(), name="room-note"),
    path("rooms/<slug:slug>/revisions/", NoteRevisionsView.as_view(), name="note-revisions"),
]
