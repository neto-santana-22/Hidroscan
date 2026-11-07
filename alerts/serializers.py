from rest_framework import serializers

from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            "id", "property", "device", "rule_code", "title", "description", "severity", "status",
            "first_detected_at", "last_detected_at", "occurrences_count", "acknowledged_at", "acknowledged_by",
        ]
        read_only_fields = fields
