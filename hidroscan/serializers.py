from rest_framework import serializers

from .models import AuditLog, Device, Property, Region, RegionAccess
from .services import create_device


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "name", "code", "active"]
        read_only_fields = ["id"]


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ["id", "name", "address", "region", "owner", "active"]
        read_only_fields = ["id"]


class DeviceSerializer(serializers.ModelSerializer):
    device_key = serializers.CharField(write_only=True, required=False, min_length=16)

    class Meta:
        model = Device
        fields = [
            "id",
            "property",
            "name",
            "serial_number",
            "device_key",
            "valve_state",
            "last_reading_at",
            "active",
        ]
        read_only_fields = ["id", "last_reading_at"]

    def create(self, validated_data):
        device_key = validated_data.pop("device_key", None)
        if device_key is None:
            raise serializers.ValidationError({"device_key": "A chave do dispositivo é obrigatória."})
        return create_device(actor=self.context["request"].user, device_key=device_key, **validated_data)

    def update(self, instance, validated_data):
        device_key = validated_data.pop("device_key", None)
        if device_key:
            instance.set_device_key(device_key)
        return super().update(instance, validated_data)


class RegionAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegionAccess
        fields = ["id", "user", "region"]
        read_only_fields = ["id"]


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "actor", "action", "resource_type", "resource_id", "details", "created_at"]
