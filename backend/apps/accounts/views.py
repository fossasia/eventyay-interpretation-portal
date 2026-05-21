from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model, logout
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, ProfileUpdateSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(APIView):
    # Allow cross-origin registration from the SPA without requiring a CSRF token.
    # Disable authentication on this endpoint so DRF won't run SessionAuthentication
    # (which would enforce CSRF checks for unsafe methods).
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"user": UserSerializer(user).data, "token": token.key},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    # Allow cross-origin login from the SPA without requiring a CSRF token.
    # Disable authentication on this endpoint so DRF won't run SessionAuthentication
    # (which would enforce CSRF checks for unsafe methods). The SPA uses token
    # authentication, so we return the token without creating a session cookie.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        # Do NOT call Django's `login()` here — we don't want to create a session
        # or require CSRF for the SPA. Return the token for the client to store.
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"user": UserSerializer(user).data, "token": token.key})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        try:
            request.user.auth_token.delete()
        except Token.DoesNotExist:
            pass
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)

    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
