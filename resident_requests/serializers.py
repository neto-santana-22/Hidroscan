from rest_framework import serializers

from .models import ResidentRequest


class ResidentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidentRequest
        fields = ["id", "property", "requester", "category", "description", "status", "resolution", "created_at", "updated_at"]
        read_only_fields = ["id", "requester", "status", "resolution", "created_at", "updated_at"]


class ResidentRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ResidentRequest.Status.choices)
    resolution = serializers.CharField(required=False, allow_blank=True)
