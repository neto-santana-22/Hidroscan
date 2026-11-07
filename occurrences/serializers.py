from rest_framework import serializers

from .models import Occurrence, OccurrenceUpdate


class OccurrenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occurrence
        fields = ["id", "property", "alert", "title", "description", "status", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_by", "created_at", "updated_at"]


class OccurrenceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OccurrenceUpdate
        fields = ["id", "occurrence", "author", "message", "status", "created_at"]
        read_only_fields = ["id", "occurrence", "author", "created_at"]
