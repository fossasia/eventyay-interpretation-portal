from __future__ import annotations

from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership
from apps.rooms.rbac import PERM_STREAMING_CONTROL, has_permission

from .models import StreamSession
from .serializers import StartStreamSerializer, StreamSessionSerializer


def _require_streaming_control(room: Room, user) -> RoomMembership | Response:
    membership = get_object_or_404(RoomMembership, room=room, user=user)
    if not has_permission(membership, PERM_STREAMING_CONTROL):
        from rest_framework.response import Response
        return Response({"detail": "Permission denied."}, status=403)
    return membership


class StreamStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        get_object_or_404(RoomMembership, room=room, user=request.user)
        session = StreamSession.objects.filter(
            room=room, status__in=[StreamSession.STATUS_RECORDING, StreamSession.STATUS_LIVE]
        ).first()
        if session is None:
            return Response({"status": StreamSession.STATUS_IDLE})
        return Response(StreamSessionSerializer(session).data)


class StreamStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        result = _require_streaming_control(room, request.user)
        if isinstance(result, Response):
            return result

        active = StreamSession.objects.filter(
            room=room, status__in=[StreamSession.STATUS_RECORDING, StreamSession.STATUS_LIVE]
        ).exists()
        if active:
            return Response({"detail": "A stream session is already active."}, status=400)

        serializer = StartStreamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dest = data["destination"]
        stream_status = (
            StreamSession.STATUS_LIVE
            if dest == StreamSession.DESTINATION_YOUTUBE
            else StreamSession.STATUS_RECORDING
        )
        session = StreamSession.objects.create(
            room=room,
            started_by=request.user,
            status=stream_status,
            destination=dest,
            stream_key=data.get("stream_key", ""),
            youtube_stream_url=data.get("youtube_stream_url", ""),
            started_at=timezone.now(),
        )
        return Response(StreamSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class StreamStopView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        result = _require_streaming_control(room, request.user)
        if isinstance(result, Response):
            return result

        session = StreamSession.objects.filter(
            room=room, status__in=[StreamSession.STATUS_RECORDING, StreamSession.STATUS_LIVE]
        ).first()
        if session is None:
            return Response({"detail": "No active stream session."}, status=404)

        session.status = StreamSession.STATUS_ENDED
        session.ended_at = timezone.now()
        session.save()
        return Response(StreamSessionSerializer(session).data)
