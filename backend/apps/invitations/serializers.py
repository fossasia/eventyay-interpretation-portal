from __future__ import annotations

from rest_framework import serializers

from .models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = Invitation
        fields = [
            "id", "token", "role", "expires_at", "is_active",
            "max_uses", "use_count", "created_at", "invite_url", "is_valid",
        ]
        read_only_fields = ["id", "token", "use_count", "created_at", "invite_url", "is_valid"]

    def get_invite_url(self, obj: Invitation) -> str:
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/join/{obj.token}/")
        return f"/join/{obj.token}/"


class CreateInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["role", "expires_at", "max_uses"]
