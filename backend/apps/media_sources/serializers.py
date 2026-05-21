from __future__ import annotations

from rest_framework import serializers

from .models import MediaSource


class MediaSourceSerializer(serializers.ModelSerializer):
    uploaded_by_display = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaSource
        fields = [
            "id", "source_type", "title", "file", "file_url", "url",
            "thumbnail", "thumbnail_url", "is_active", "metadata",
            "uploaded_by", "uploaded_by_display", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "uploaded_by", "uploaded_by_display", "created_at", "updated_at", "file_url", "thumbnail_url"]
        extra_kwargs = {
            "file": {"write_only": True},
            "thumbnail": {"write_only": True},
        }

    def get_uploaded_by_display(self, obj: MediaSource) -> str:
        return str(obj.uploaded_by) if obj.uploaded_by else ""

    def get_file_url(self, obj: MediaSource) -> str | None:
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_thumbnail_url(self, obj: MediaSource) -> str | None:
        if obj.thumbnail:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
        return None

    def validate(self, attrs: dict) -> dict:
        source_type = attrs.get("source_type", "")
        file_types = {"pdf", "slides", "image", "video"}
        url_types = {"youtube"}
        if source_type in file_types and not attrs.get("file") and not self.instance:
            raise serializers.ValidationError({"file": "A file is required for this source type."})
        if source_type in url_types and not attrs.get("url"):
            raise serializers.ValidationError({"url": "A URL is required for YouTube sources."})
        return attrs
