from __future__ import annotations

from rest_framework import serializers

from .models import NoteRevision, RoomNote


class NoteRevisionSerializer(serializers.ModelSerializer):
    author_display = serializers.SerializerMethodField()

    class Meta:
        model = NoteRevision
        fields = ["id", "author_display", "content", "created_at"]
        read_only_fields = ["id", "author_display", "created_at"]

    def get_author_display(self, obj: NoteRevision) -> str:
        return str(obj.author) if obj.author else ""


class RoomNoteSerializer(serializers.ModelSerializer):
    updated_by_display = serializers.SerializerMethodField()

    class Meta:
        model = RoomNote
        fields = ["id", "content", "updated_by_display", "created_at", "updated_at"]
        read_only_fields = ["id", "updated_by_display", "created_at", "updated_at"]

    def get_updated_by_display(self, obj: RoomNote) -> str:
        return str(obj.updated_by) if obj.updated_by else ""
