from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Room, RoomMembership, Stage, StageParticipant
from .rbac import ROLE_CHOICES, ROLE_MODERATOR, ROLE_PARTICIPANT

User = get_user_model()


class RoomSerializer(serializers.ModelSerializer):
    owner_display = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id", "name", "slug", "description", "is_active", "default_layout",
            "settings_json", "created_at", "updated_at", "owner_display", "member_count",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "owner_display", "member_count"]

    def get_owner_display(self, obj: Room) -> str:
        return str(obj.owner)

    def get_member_count(self, obj: Room) -> int:
        return obj.memberships.count()


class RoomMembershipSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = RoomMembership
        fields = [
            "id", "user", "user_display", "user_email", "user_avatar",
            "role", "permissions", "joined_at",
        ]
        read_only_fields = ["id", "joined_at", "user_display", "user_email", "user_avatar"]

    def get_user_display(self, obj: RoomMembership) -> str:
        return str(obj.user)

    def get_user_email(self, obj: RoomMembership) -> str:
        return obj.user.email

    def get_user_avatar(self, obj: RoomMembership) -> str | None:
        if obj.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
        return None


class StageParticipantSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = StageParticipant
        fields = [
            "id", "user", "user_display", "user_avatar",
            "position", "is_pinned", "is_spotlighted", "is_muted", "camera_off", "added_at",
        ]
        read_only_fields = ["id", "added_at", "user_display", "user_avatar"]

    def get_user_display(self, obj: StageParticipant) -> str:
        return str(obj.user)

    def get_user_avatar(self, obj: StageParticipant) -> str | None:
        if obj.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
        return None


class StageSerializer(serializers.ModelSerializer):
    participants = StageParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ["id", "layout", "is_live", "participants", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AddToStageSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class UpdateStageParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = StageParticipant
        fields = ["position", "is_pinned", "is_spotlighted", "is_muted", "camera_off"]


class AssignRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[ROLE_MODERATOR, ROLE_PARTICIPANT])
