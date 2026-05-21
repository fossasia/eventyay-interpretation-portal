from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room, RoomMembership, Stage, StageParticipant
from .rbac import (
    PERM_LAYOUT_CONTROL,
    PERM_MEMBERS_ASSIGN_MODERATOR,
    PERM_PARTICIPANTS_REMOVE,
    PERM_STAGE_ADD,
    PERM_STAGE_MUTE,
    PERM_STAGE_PIN,
    PERM_STAGE_REMOVE,
    PERM_STAGE_SPOTLIGHT,
    ROLE_ROOM_CREATOR,
    has_permission,
)
from .serializers import (
    AddToStageSerializer,
    AssignRoleSerializer,
    RoomMembershipSerializer,
    RoomSerializer,
    StageSerializer,
    UpdateStageParticipantSerializer,
)

User = get_user_model()


def _get_membership_or_403(room: Room, user) -> RoomMembership:
    return get_object_or_404(RoomMembership, room=room, user=user)


def _require_permission(membership: RoomMembership, perm: str) -> None | Response:
    if not has_permission(membership, perm):
        return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
    return None


# ---------------------------------------------------------------------------
# Room CRUD
# ---------------------------------------------------------------------------

class RoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        memberships = RoomMembership.objects.filter(user=request.user).select_related("room")
        rooms = [m.room for m in memberships]
        return Response(RoomSerializer(rooms, many=True, context={"request": request}).data)

    def post(self, request: Request) -> Response:
        serializer = RoomSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            room = serializer.save(owner=request.user)
            Stage.objects.create(room=room)
            RoomMembership.objects.create(
                room=room, user=request.user, role=ROLE_ROOM_CREATOR
            )
        return Response(
            RoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class RoomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_room(self, slug: str) -> Room:
        return get_object_or_404(Room, slug=slug)

    def get(self, request: Request, slug: str) -> Response:
        room = self._get_room(slug)
        _get_membership_or_403(room, request.user)
        return Response(RoomSerializer(room, context={"request": request}).data)

    def patch(self, request: Request, slug: str) -> Response:
        room = self._get_room(slug)
        membership = _get_membership_or_403(room, request.user)
        denied = _require_permission(membership, PERM_LAYOUT_CONTROL)
        if denied:
            return denied
        serializer = RoomSerializer(room, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, slug: str) -> Response:
        room = self._get_room(slug)
        if room.owner != request.user:
            return Response({"detail": "Only the room creator can delete a room."}, status=403)
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Membership
# ---------------------------------------------------------------------------

class RoomMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        _get_membership_or_403(room, request.user)
        memberships = room.memberships.select_related("user").all()
        return Response(
            RoomMembershipSerializer(memberships, many=True, context={"request": request}).data
        )


class RoomJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug, is_active=True)
        membership, created = RoomMembership.objects.get_or_create(
            room=room, user=request.user, defaults={"role": "participant"}
        )
        return Response(
            RoomMembershipSerializer(membership, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class RoomLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        if room.owner == request.user:
            return Response({"detail": "Room creator cannot leave their own room."}, status=400)
        RoomMembership.objects.filter(room=room, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomAssignRoleView(APIView):
    """Moderator/creator can change a member's role."""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, slug: str, user_id: int) -> Response:
        room = get_object_or_404(Room, slug=slug)
        actor_membership = _get_membership_or_403(room, request.user)
        denied = _require_permission(actor_membership, PERM_MEMBERS_ASSIGN_MODERATOR)
        if denied:
            return denied
        target_membership = get_object_or_404(RoomMembership, room=room, user_id=user_id)
        if target_membership.role == ROLE_ROOM_CREATOR:
            return Response({"detail": "Cannot change the room creator's role."}, status=400)
        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_membership.role = serializer.validated_data["role"]
        target_membership.save()
        return Response(RoomMembershipSerializer(target_membership, context={"request": request}).data)


class RemoveParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, slug: str, user_id: int) -> Response:
        room = get_object_or_404(Room, slug=slug)
        actor_membership = _get_membership_or_403(room, request.user)
        denied = _require_permission(actor_membership, PERM_PARTICIPANTS_REMOVE)
        if denied:
            return denied
        if room.owner_id == user_id:
            return Response({"detail": "Cannot remove the room creator."}, status=400)
        RoomMembership.objects.filter(room=room, user_id=user_id).delete()
        StageParticipant.objects.filter(stage__room=room, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Stage
# ---------------------------------------------------------------------------

class StageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        _get_membership_or_403(room, request.user)
        stage = get_object_or_404(Stage, room=room)
        return Response(StageSerializer(stage, context={"request": request}).data)


class StageAddParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        actor_membership = _get_membership_or_403(room, request.user)
        denied = _require_permission(actor_membership, PERM_STAGE_ADD)
        if denied:
            return denied
        serializer = AddToStageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user = get_object_or_404(User, pk=serializer.validated_data["user_id"])
        get_object_or_404(RoomMembership, room=room, user=target_user)
        stage = get_object_or_404(Stage, room=room)
        sp, created = StageParticipant.objects.get_or_create(
            stage=stage,
            user=target_user,
            defaults={"added_by": request.user},
        )
        return Response(
            StageSerializer(stage, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class StageParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, slug: str, user_id: int) -> Response:
        room = get_object_or_404(Room, slug=slug)
        actor_membership = _get_membership_or_403(room, request.user)

        sp = get_object_or_404(StageParticipant, stage__room=room, user_id=user_id)
        data = request.data

        # Enforce per-permission checks
        if "is_muted" in data:
            denied = _require_permission(actor_membership, PERM_STAGE_MUTE)
            if denied:
                return denied
        if "is_pinned" in data:
            denied = _require_permission(actor_membership, PERM_STAGE_PIN)
            if denied:
                return denied
        if "is_spotlighted" in data:
            denied = _require_permission(actor_membership, PERM_STAGE_SPOTLIGHT)
            if denied:
                return denied

        serializer = UpdateStageParticipantSerializer(sp, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        stage = get_object_or_404(Stage, room=room)
        return Response(StageSerializer(stage, context={"request": request}).data)

    def delete(self, request: Request, slug: str, user_id: int) -> Response:
        room = get_object_or_404(Room, slug=slug)
        actor_membership = _get_membership_or_403(room, request.user)
        denied = _require_permission(actor_membership, PERM_STAGE_REMOVE)
        if denied:
            return denied
        sp = get_object_or_404(StageParticipant, stage__room=room, user_id=user_id)
        sp.delete()
        stage = get_object_or_404(Stage, room=room)
        return Response(StageSerializer(stage, context={"request": request}).data)
