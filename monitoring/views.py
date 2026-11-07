from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hidroscan.access import imoveis_visiveis

from .authentication import DeviceKeyAuthentication
from .models import Reading
from .permissions import HasAuthenticatedDevice
from .serializers import ConsumptionQuerySerializer, ReadingIngestionSerializer, ReadingSerializer
from .services import ReadingValidationError, registrar_leitura


@extend_schema(request=ReadingIngestionSerializer, responses={201: ReadingSerializer, 200: ReadingSerializer})
@api_view(["POST"])
@authentication_classes([DeviceKeyAuthentication])
@permission_classes([HasAuthenticatedDevice])
def ingest_reading(request):
    serializer = ReadingIngestionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        reading, created = registrar_leitura(
            device=request.user.device,
            **serializer.validated_data,
        )
    except ReadingValidationError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ReadingSerializer(reading).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


def _visible_property_or_404(request, property_id):
    return get_object_or_404(imoveis_visiveis(request.user), pk=property_id)


@extend_schema(responses=ReadingSerializer(many=True))
@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def property_readings(request, property_id):
    property_instance = _visible_property_or_404(request, property_id)
    readings = Reading.objects.filter(device__property=property_instance).select_related("device")
    try:
        page_size = int(request.query_params.get("limite", 100))
    except ValueError:
        return Response({"limite": "Informe um número inteiro."}, status=status.HTTP_400_BAD_REQUEST)
    page_size = min(max(page_size, 1), 500)
    return Response(ReadingSerializer(readings[:page_size], many=True).data)


@extend_schema(parameters=[ConsumptionQuerySerializer], responses=dict)
@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def property_consumption(request, property_id):
    property_instance = _visible_property_or_404(request, property_id)
    query = ConsumptionQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    readings = Reading.objects.filter(device__property=property_instance)
    if inicio := query.validated_data.get("inicio"):
        readings = readings.filter(measured_at__gte=inicio)
    if fim := query.validated_data.get("fim"):
        readings = readings.filter(measured_at__lte=fim)
    total = readings.aggregate(total=Sum("consumption"))["total"] or 0
    return Response({"property": property_instance.pk, "consumption": total, "unit": "m3"})


@extend_schema(responses=dict)
@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def dashboard(request):
    properties = imoveis_visiveis(request.user)
    today = timezone.localdate()
    readings = Reading.objects.filter(device__property__in=properties)
    latest = readings.order_by("-measured_at", "-id").first()
    return Response(
        {
            "properties": properties.count(),
            "devices": readings.values("device_id").distinct().count(),
            "consumption_today": readings.filter(measured_at__date=today).aggregate(total=Sum("consumption"))["total"] or 0,
            "last_reading_at": latest.measured_at if latest else None,
        }
    )
