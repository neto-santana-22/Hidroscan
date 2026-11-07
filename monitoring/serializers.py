from rest_framework import serializers

from .models import Reading


class ReadingIngestionSerializer(serializers.Serializer):
    external_id = serializers.UUIDField()
    measured_at = serializers.DateTimeField()
    volume = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=0)


class ReadingSerializer(serializers.ModelSerializer):
    device = serializers.IntegerField(source="device_id", read_only=True)

    class Meta:
        model = Reading
        fields = ["id", "device", "external_id", "measured_at", "volume", "consumption", "received_at"]
        read_only_fields = fields


class ConsumptionQuerySerializer(serializers.Serializer):
    inicio = serializers.DateTimeField(required=False)
    fim = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if attrs.get("inicio") and attrs.get("fim") and attrs["inicio"] > attrs["fim"]:
            raise serializers.ValidationError("'inicio' deve ser anterior ou igual a 'fim'.")
        return attrs
