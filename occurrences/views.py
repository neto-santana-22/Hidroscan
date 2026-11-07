from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from hidroscan.access import imoveis_visiveis

from hidroscan.permissions import IsOperationsUser

from .models import Occurrence
from .serializers import OccurrenceSerializer, OccurrenceUpdateSerializer
from .services import OccurrenceValidationError, add_update, create_occurrence


class OccurrenceViewSet(viewsets.ModelViewSet):
    serializer_class = OccurrenceSerializer
    permission_classes = [IsOperationsUser]

    def get_queryset(self):
        return Occurrence.objects.filter(property__in=imoveis_visiveis(self.request.user)).select_related("property", "alert")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not imoveis_visiveis(request.user).filter(pk=serializer.validated_data["property"].pk).exists():
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            occurrence = create_occurrence(actor=request.user, **serializer.validated_data)
        except OccurrenceValidationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(occurrence).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="atualizacoes")
    def updates(self, request, pk=None):
        occurrence = self.get_object()
        if request.method == "GET":
            return Response(OccurrenceUpdateSerializer(occurrence.updates.all(), many=True).data)
        serializer = OccurrenceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            update = add_update(occurrence=occurrence, actor=request.user, **serializer.validated_data)
        except OccurrenceValidationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OccurrenceUpdateSerializer(update).data, status=status.HTTP_201_CREATED)
