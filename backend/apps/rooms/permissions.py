from __future__ import annotations

from rest_framework import permissions

from .models import RoomMembership
from .rbac import has_permission


class IsRoomMember(permissions.BasePermission):
    """Allows access only to users who are members of the room (any role)."""

    def has_object_permission(self, request, view, obj) -> bool:
        room = getattr(obj, "room", obj)
        return RoomMembership.objects.filter(room=room, user=request.user).exists()


class RoomPermission(permissions.BasePermission):
    """
    Resolves RBAC permissions for a room action.

    The view must set `required_permission` on the view class.
    """

    required_permission: str = ""

    def has_object_permission(self, request, view, obj) -> bool:
        perm = getattr(view, "required_permission", self.required_permission)
        if not perm:
            return False
        room = getattr(obj, "room", obj)
        try:
            membership = RoomMembership.objects.get(room=room, user=request.user)
        except RoomMembership.DoesNotExist:
            return False
        return has_permission(membership, perm)
