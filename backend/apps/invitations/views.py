from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership
from apps.rooms.rbac import ROLE_ROOM_CREATOR, has_permission, PERM_STAGE_ADD

from .models import Invitation
from .serializers import CreateInvitationSerializer, InvitationSerializer


class InvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = get_object_or_404(RoomMembership, room=room, user=request.user)
        # Only moderators and room creators can list invitations
        if membership.role not in (ROLE_ROOM_CREATOR, "moderator"):
            return Response({"detail": "Permission denied."}, status=403)
        invitations = room.invitations.filter(is_active=True).select_related("created_by")
        return Response(
            InvitationSerializer(invitations, many=True, context={"request": request}).data
        )

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = get_object_or_404(RoomMembership, room=room, user=request.user)
        if membership.role not in (ROLE_ROOM_CREATOR, "moderator"):
            return Response({"detail": "Permission denied."}, status=403)
        serializer = CreateInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save(room=room, created_by=request.user)
        return Response(
            InvitationSerializer(invitation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, slug: str, invitation_id: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        membership = get_object_or_404(RoomMembership, room=room, user=request.user)
        if membership.role not in (ROLE_ROOM_CREATOR, "moderator"):
            return Response({"detail": "Permission denied."}, status=403)
        invitation = get_object_or_404(Invitation, pk=invitation_id, room=room)
        invitation.is_active = False
        invitation.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationValidateView(APIView):
    """Public endpoint — preview invitation details without accepting.

    Used by the join page to show the user what room / role they're joining
    before they click Accept (which requires authentication).
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        invitation = get_object_or_404(Invitation, token=token)
        if not invitation.is_valid:
            return Response({"detail": "This invitation is no longer valid."}, status=status.HTTP_410_GONE)
        return Response(
            {
                "room_name": invitation.room.name,
                "room_slug": invitation.room.slug,
                "role": invitation.role,
                "valid": True,
            }
        )


class InvitationAcceptView(APIView):
    """Public endpoint — accept an invite link (user must be authenticated)."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, token: str) -> Response:
        invitation = get_object_or_404(Invitation, token=token)
        if not invitation.is_valid:
            return Response({"detail": "This invitation is no longer valid."}, status=410)
        with transaction.atomic():
            membership, created = RoomMembership.objects.get_or_create(
                room=invitation.room,
                user=request.user,
                defaults={"role": invitation.role},
            )
            if not created and membership.role == invitation.role:
                return Response(
                    {"detail": "Already a member.", "role": membership.role},
                    status=status.HTTP_200_OK,
                )
            invitation.use_count += 1
            invitation.save(update_fields=["use_count"])
        return Response(
            {
                "detail": "Joined successfully.",
                "room_slug": invitation.room.slug,
                "role": membership.role,
            },
            status=status.HTTP_200_OK,
        )
