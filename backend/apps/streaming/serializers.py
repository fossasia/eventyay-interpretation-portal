from __future__ import annotations

from rest_framework import serializers

from .models import StreamSession


class StreamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreamSession
        fields = [
            "id", "status", "destination", "stream_key",
            "youtube_broadcast_id", "youtube_stream_url",
            "started_at", "ended_at", "created_at",
        ]
        read_only_fields = [
            "id", "status", "started_at", "ended_at", "created_at",
            "youtube_broadcast_id",
        ]
        extra_kwargs = {
            "stream_key": {"write_only": True},
        }


class StartStreamSerializer(serializers.Serializer):
    destination = serializers.ChoiceField(
        choices=[StreamSession.DESTINATION_YOUTUBE, StreamSession.DESTINATION_LOCAL]
    )
    stream_key = serializers.CharField(required=False, allow_blank=True)
    youtube_stream_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs: dict) -> dict:
        if attrs["destination"] == StreamSession.DESTINATION_YOUTUBE:
            if not attrs.get("stream_key"):
                raise serializers.ValidationError({"stream_key": "Stream key required for YouTube."})
            if not attrs.get("youtube_stream_url"):
                raise serializers.ValidationError({"youtube_stream_url": "Stream URL required for YouTube."})
        return attrs
