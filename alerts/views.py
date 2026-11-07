from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hidroscan.access import imoveis_visiveis
from hidroscan.permissions import IsOperationsUser
from hidroscan.services import register_audit

from .models import Alert
from .serializers import AlertSerializer


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Alert.objects.filter(property__in=imoveis_visiveis(self.request.user)).select_related("property", "device")
        if status_value := self.request.query_params.get("status"):
            queryset = queryset.filter(status=status_value)
        return queryset

    @action(detail=True, methods=["post"], permission_classes=[IsOperationsUser])
    def reconhecer(self, request, pk=None):
        alert = self.get_object()
        if alert.status == Alert.Status.RESOLVED:
            return Response({"detail": "Alertas resolvidos não podem ser reconhecidos."}, status=status.HTTP_400_BAD_REQUEST)
        if alert.status != Alert.Status.ACKNOWLEDGED:
            alert.status = Alert.Status.ACKNOWLEDGED
            alert.acknowledged_at = timezone.now()
            alert.acknowledged_by = request.user
            alert.save(update_fields=["status", "acknowledged_at", "acknowledged_by"])
            register_audit(actor=request.user, action="alert.acknowledged", resource=alert)
        return Response(self.get_serializer(alert).data)
