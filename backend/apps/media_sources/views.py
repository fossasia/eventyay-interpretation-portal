from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership
from apps.rooms.rbac import PERM_MEDIA_MANAGE, has_permission

from .models import MediaSource
from .serializers import MediaSourceSerializer


def _get_membership_or_403(room: Room, user) -> RoomMembership:
    return get_object_or_404(RoomMembership, room=room, user=user)


class MediaSourceListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        _get_membership_or_403(room, request.user)
        sources = room.media_sources.all()
        return Response(MediaSourceSerializer(sources, many=True, context={"request": request}).data)

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = _get_membership_or_403(room, request.user)
        if not has_permission(membership, PERM_MEDIA_MANAGE):
            return Response({"detail": "Permission denied."}, status=403)
        serializer = MediaSourceSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(room=room, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MediaSourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, slug: str, media_id: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = _get_membership_or_403(room, request.user)
        if not has_permission(membership, PERM_MEDIA_MANAGE):
            return Response({"detail": "Permission denied."}, status=403)
        source = get_object_or_404(MediaSource, pk=media_id, room=room)
        source.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MediaSourceActivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str, media_id: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = _get_membership_or_403(room, request.user)
        if not has_permission(membership, PERM_MEDIA_MANAGE):
            return Response({"detail": "Permission denied."}, status=403)
        source = get_object_or_404(MediaSource, pk=media_id, room=room)
        source.is_active = True
        source.save()
        return Response(MediaSourceSerializer(source, context={"request": request}).data)
