from rest_framework import serializers

from .models import ValveCommand


class ValveCommandCreateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=ValveCommand.Action.choices)
    reason = serializers.CharField(max_length=1000, trim_whitespace=True)

    def validate_reason(self, value):
        if not value:
            raise serializers.ValidationError("O motivo do comando é obrigatório.")
        return value


class ValveCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValveCommand
        fields = ["id", "device", "requested_by", "action", "reason", "status", "requested_at"]
        read_only_fields = fields
