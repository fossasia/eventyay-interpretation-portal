from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from apps.rooms.models import Room, RoomMembership, Stage
from apps.rooms.rbac import ROLE_MODERATOR, ROLE_ROOM_CREATOR, has_permission, PERM_STAGE_ADD, PERM_CHAT

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="owner", email="owner@example.com", password="pass")


@pytest.fixture
def auth_client(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Token {token.key}"
    return client


@pytest.mark.django_db
def test_create_room(auth_client, user) -> None:
    res = auth_client.post(
        "/api/rooms/",
        data={"name": "My Studio"},
        content_type="application/json",
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "My Studio"
    assert Room.objects.filter(slug=data["slug"]).exists()
    # Creator membership created automatically
    assert RoomMembership.objects.filter(room__slug=data["slug"], user=user, role=ROLE_ROOM_CREATOR).exists()
    # Stage created automatically
    assert Stage.objects.filter(room__slug=data["slug"]).exists()


@pytest.mark.django_db
def test_room_creator_has_all_permissions(user, db) -> None:
    room = Room.objects.create(name="Test", owner=user)
    membership = RoomMembership.objects.create(room=room, user=user, role=ROLE_ROOM_CREATOR)
    assert has_permission(membership, PERM_STAGE_ADD) is True
    assert has_permission(membership, PERM_CHAT) is True


@pytest.mark.django_db
def test_viewer_cannot_add_to_stage(user, db) -> None:
    room = Room.objects.create(name="Test", owner=user)
    viewer = User.objects.create_user(username="viewer", email="v@e.com", password="pass")
    membership = RoomMembership.objects.create(room=room, user=viewer, role="viewer")
    assert has_permission(membership, PERM_STAGE_ADD) is False


@pytest.mark.django_db
def test_list_rooms_requires_auth(client) -> None:
    res = client.get("/api/rooms/")
    # DRF returns 403 for SessionAuthentication unauthenticated requests and 401 for Token
    assert res.status_code in (401, 403)
