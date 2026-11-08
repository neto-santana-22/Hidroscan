from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hidroscan.access import imoveis_visiveis
from hidroscan.models import Device
from hidroscan.permissions import IsOperationsUser

from .serializers import ValveCommandCreateSerializer, ValveCommandSerializer
from .services import command_valve


def _visible_device_or_404(request, device_id):
    return get_object_or_404(Device.objects.filter(property__in=imoveis_visiveis(request.user)), pk=device_id)


@extend_schema(request=ValveCommandCreateSerializer, responses={201: ValveCommandSerializer})
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def valve(request, device_id):
    device = _visible_device_or_404(request, device_id)
    if request.method == "GET":
        return Response({"device": device.pk, "state": device.valve_state})
    if not IsOperationsUser().has_permission(request, None):
        return Response({"detail": IsOperationsUser.message}, status=status.HTTP_403_FORBIDDEN)
    serializer = ValveCommandCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    command = command_valve(device=device, actor=request.user, **serializer.validated_data)
    return Response({"command": ValveCommandSerializer(command).data, "state": command.device.valve_state}, status=status.HTTP_201_CREATED)
