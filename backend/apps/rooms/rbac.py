from __future__ import annotations

"""
RBAC permission definitions for the studio platform.

Permission resolution order:
  1. room_creator — has all permissions
  2. moderator    — explicit allow list
  3. participant  — limited set; some can be toggled per-room
  4. viewer       — watch + optional chat
"""

from typing import Final

# ---------------------------------------------------------------------------
# Role constants
# ---------------------------------------------------------------------------
ROLE_ROOM_CREATOR: Final = "room_creator"
ROLE_MODERATOR: Final = "moderator"
ROLE_PARTICIPANT: Final = "participant"
ROLE_VIEWER: Final = "viewer"

ALL_ROLES: Final = (ROLE_ROOM_CREATOR, ROLE_MODERATOR, ROLE_PARTICIPANT, ROLE_VIEWER)

ROLE_CHOICES = [
    (ROLE_ROOM_CREATOR, "Room Creator"),
    (ROLE_MODERATOR, "Moderator"),
    (ROLE_PARTICIPANT, "Participant"),
    (ROLE_VIEWER, "Viewer"),
]

# ---------------------------------------------------------------------------
# Permission constants
# ---------------------------------------------------------------------------
PERM_STAGE_ADD = "stage.add_participant"
PERM_STAGE_REMOVE = "stage.remove_participant"
PERM_STAGE_MUTE = "stage.mute"
PERM_STAGE_PIN = "stage.pin"
PERM_STAGE_SPOTLIGHT = "stage.spotlight"
PERM_MEDIA_MANAGE = "media.manage"
PERM_PARTICIPANTS_REMOVE = "participants.remove"
PERM_LAYOUT_CONTROL = "layout.control"
PERM_STREAMING_CONTROL = "streaming.control"
PERM_MEMBERS_ASSIGN_MODERATOR = "members.assign_moderator"
PERM_CHAT = "chat"
PERM_RAISE_HAND = "raise_hand"
PERM_SCREEN_SHARE = "screen_share"
PERM_MIC = "mic"
PERM_CAMERA = "camera"

# ---------------------------------------------------------------------------
# Default permission matrix
# ---------------------------------------------------------------------------
_DEFAULT_PERMISSIONS: dict[str, dict[str, bool]] = {
    ROLE_ROOM_CREATOR: {
        PERM_STAGE_ADD: True,
        PERM_STAGE_REMOVE: True,
        PERM_STAGE_MUTE: True,
        PERM_STAGE_PIN: True,
        PERM_STAGE_SPOTLIGHT: True,
        PERM_MEDIA_MANAGE: True,
        PERM_PARTICIPANTS_REMOVE: True,
        PERM_LAYOUT_CONTROL: True,
        PERM_STREAMING_CONTROL: True,
        PERM_MEMBERS_ASSIGN_MODERATOR: True,
        PERM_CHAT: True,
        PERM_RAISE_HAND: True,
        PERM_SCREEN_SHARE: True,
        PERM_MIC: True,
        PERM_CAMERA: True,
    },
    ROLE_MODERATOR: {
        PERM_STAGE_ADD: True,
        PERM_STAGE_REMOVE: True,
        PERM_STAGE_MUTE: True,
        PERM_STAGE_PIN: True,
        PERM_STAGE_SPOTLIGHT: True,
        PERM_MEDIA_MANAGE: True,
        PERM_PARTICIPANTS_REMOVE: True,
        PERM_LAYOUT_CONTROL: True,
        PERM_STREAMING_CONTROL: True,
        PERM_MEMBERS_ASSIGN_MODERATOR: True,
        PERM_CHAT: True,
        PERM_RAISE_HAND: True,
        PERM_SCREEN_SHARE: True,
        PERM_MIC: True,
        PERM_CAMERA: True,
    },
    ROLE_PARTICIPANT: {
        PERM_STAGE_ADD: False,
        PERM_STAGE_REMOVE: False,
        PERM_STAGE_MUTE: False,
        PERM_STAGE_PIN: False,
        PERM_STAGE_SPOTLIGHT: False,
        PERM_MEDIA_MANAGE: False,
        PERM_PARTICIPANTS_REMOVE: False,
        PERM_LAYOUT_CONTROL: False,
        PERM_STREAMING_CONTROL: False,
        PERM_MEMBERS_ASSIGN_MODERATOR: False,
        PERM_CHAT: True,
        PERM_RAISE_HAND: True,
        PERM_SCREEN_SHARE: False,  # room-level toggle
        PERM_MIC: True,
        PERM_CAMERA: True,
    },
    ROLE_VIEWER: {
        PERM_STAGE_ADD: False,
        PERM_STAGE_REMOVE: False,
        PERM_STAGE_MUTE: False,
        PERM_STAGE_PIN: False,
        PERM_STAGE_SPOTLIGHT: False,
        PERM_MEDIA_MANAGE: False,
        PERM_PARTICIPANTS_REMOVE: False,
        PERM_LAYOUT_CONTROL: False,
        PERM_STREAMING_CONTROL: False,
        PERM_MEMBERS_ASSIGN_MODERATOR: False,
        PERM_CHAT: False,  # room-level toggle
        PERM_RAISE_HAND: False,
        PERM_SCREEN_SHARE: False,
        PERM_MIC: False,
        PERM_CAMERA: False,
    },
}


def get_default_permissions(role: str) -> dict[str, bool]:
    """Return a copy of the default permission map for *role*."""
    return dict(_DEFAULT_PERMISSIONS.get(role, {}))


def has_permission(membership: "RoomMembership", permission: str) -> bool:  # noqa: F821
    """
    Resolve whether *membership* grants *permission*.

    Custom per-room overrides stored in membership.permissions take precedence
    over the defaults.
    """
    # room_creator always has everything
    if membership.role == ROLE_ROOM_CREATOR:
        return True
    custom = membership.permissions or {}
    if permission in custom:
        return bool(custom[permission])
    return _DEFAULT_PERMISSIONS.get(membership.role, {}).get(permission, False)
