from rest_framework import serializers

from accounts.models import User

from .models import WorkOrder


class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = [
            "id", "occurrence", "assigned_to", "title", "description", "priority", "status",
            "due_at", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_by", "created_at", "updated_at"]

    def validate_assigned_to(self, user):
        if user and user.role != User.Role.TECNICO:
            raise serializers.ValidationError("A ordem só pode ser atribuída a um técnico.")
        return user
