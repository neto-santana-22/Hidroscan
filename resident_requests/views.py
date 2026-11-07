from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from hidroscan.access import imoveis_visiveis
from hidroscan.permissions import IsOperationsUser

from .models import ResidentRequest
from .serializers import ResidentRequestSerializer, ResidentRequestStatusSerializer
from .services import ResidentRequestValidationError, change_status, create_request


class IsResident(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == User.Role.MORADOR)


class ResidentRequestViewSet(viewsets.ModelViewSet):
    queryset = ResidentRequest.objects.none()
    serializer_class = ResidentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ResidentRequest.objects.filter(property__in=imoveis_visiveis(user)).select_related("property", "requester")
        return queryset.filter(requester=user) if user.role == User.Role.MORADOR else queryset

    def get_permissions(self):
        if self.action == "create":
            return [IsResident()]
        if self.action == "set_status":
            return [IsOperationsUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        property_instance = serializer.validated_data["property"]
        if property_instance.owner_id != request.user.id:
            return Response(status=status.HTTP_404_NOT_FOUND)
        resident_request = create_request(actor=request.user, **serializer.validated_data)
        return Response(self.get_serializer(resident_request).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Use a ação de status para alterar uma solicitação."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    partial_update = update

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        resident_request = self.get_object()
        serializer = ResidentRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            resident_request = change_status(
                request=resident_request,
                actor=request.user,
                **serializer.validated_data,
            )
        except ResidentRequestValidationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(resident_request).data)
