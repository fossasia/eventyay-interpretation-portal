from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_user_creation() -> None:
    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="strongpass123",
    )
    assert user.pk is not None
    assert user.email == "test@example.com"


@pytest.mark.django_db
def test_register_endpoint(client) -> None:
    res = client.post(
        "/api/auth/register/",
        data={
            "username": "alice",
            "email": "alice@example.com",
            "password": "securepass123",
            "password_confirm": "securepass123",
            "display_name": "Alice",
        },
        content_type="application/json",
    )
    assert res.status_code == 201
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "alice@example.com"


@pytest.mark.django_db
def test_login_endpoint(client) -> None:
    User.objects.create_user(username="bob", email="bob@example.com", password="pass1234!")
    res = client.post(
        "/api/auth/login/",
        data={"email": "bob@example.com", "password": "pass1234!"},
        content_type="application/json",
    )
    assert res.status_code == 200
    assert "token" in res.json()


@pytest.mark.django_db
def test_login_bad_credentials(client) -> None:
    res = client.post(
        "/api/auth/login/",
        data={"email": "nobody@example.com", "password": "wrong"},
        content_type="application/json",
    )
    assert res.status_code == 401
