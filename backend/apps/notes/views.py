from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership

from .models import NoteRevision, RoomNote
from .serializers import NoteRevisionSerializer, RoomNoteSerializer


class RoomNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_note(self, room: Room) -> RoomNote:
        note, _ = RoomNote.objects.get_or_create(room=room)
        return note

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        get_object_or_404(RoomMembership, room=room, user=request.user)
        return Response(RoomNoteSerializer(self._get_note(room)).data)

    def patch(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        get_object_or_404(RoomMembership, room=room, user=request.user)
        note = self._get_note(room)
        serializer = RoomNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Save revision before updating
        NoteRevision.objects.create(
            note=note, author=request.user, content=note.content
        )
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


class NoteRevisionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        get_object_or_404(RoomMembership, room=room, user=request.user)
        note, _ = RoomNote.objects.get_or_create(room=room)
        revisions = note.revisions.select_related("author").all()[:50]
        return Response(NoteRevisionSerializer(revisions, many=True).data)
