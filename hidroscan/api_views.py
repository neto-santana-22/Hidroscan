from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .access import imoveis_visiveis
from .models import AuditLog, Device, Property, Region, RegionAccess
from .permissions import IsAdministrator
from .serializers import (
    AuditLogSerializer,
    DeviceSerializer,
    PropertySerializer,
    RegionAccessSerializer,
    RegionSerializer,
)
from .services import register_audit


class WriteRestrictedViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        permission_classes = [IsAuthenticated] if self.action in {"list", "retrieve"} else [IsAdministrator]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        instance = serializer.save()
        register_audit(actor=self.request.user, action=f"{instance._meta.model_name}.created", resource=instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        register_audit(actor=self.request.user, action=f"{instance._meta.model_name}.updated", resource=instance)

    def perform_destroy(self, instance):
        register_audit(actor=self.request.user, action=f"{instance._meta.model_name}.deleted", resource=instance)
        instance.delete()


class RegionViewSet(WriteRestrictedViewSet):
    queryset = Region.objects.order_by("name")
    serializer_class = RegionSerializer


class PropertyViewSet(WriteRestrictedViewSet):
    serializer_class = PropertySerializer

    def get_queryset(self):
        return imoveis_visiveis(self.request.user).select_related("region", "owner")


class DeviceViewSet(WriteRestrictedViewSet):
    serializer_class = DeviceSerializer

    def get_queryset(self):
        return Device.objects.filter(property__in=imoveis_visiveis(self.request.user)).select_related("property")

    def perform_create(self, serializer):
        serializer.save()


class RegionAccessViewSet(WriteRestrictedViewSet):
    queryset = RegionAccess.objects.select_related("user", "region")
    serializer_class = RegionAccessSerializer
    permission_classes = [IsAdministrator]

    def get_permissions(self):
        return [IsAdministrator()]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("actor")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdministrator]
