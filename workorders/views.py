from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from hidroscan.access import imoveis_visiveis
from hidroscan.permissions import IsOperationsUser

from .models import WorkOrder
from .serializers import WorkOrderSerializer
from .services import WorkOrderValidationError, change_status, create_work_order


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.none()
    serializer_class = WorkOrderSerializer
    permission_classes = [IsOperationsUser]

    def get_queryset(self):
        queryset = WorkOrder.objects.filter(
            occurrence__property__in=imoveis_visiveis(self.request.user)
        ).select_related("occurrence", "assigned_to")
        if self.request.user.role == User.Role.TECNICO:
            queryset = queryset.filter(assigned_to=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        occurrence = serializer.validated_data["occurrence"]
        if not imoveis_visiveis(request.user).filter(pk=occurrence.property_id).exists():
            return Response(status=status.HTTP_404_NOT_FOUND)
        work_order = create_work_order(actor=request.user, **serializer.validated_data)
        return Response(self.get_serializer(work_order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        work_order = self.get_object()
        new_status = request.data.get("status")
        if new_status not in WorkOrder.Status.values:
            return Response({"status": "Status inválido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            work_order = change_status(work_order=work_order, actor=request.user, new_status=new_status)
        except WorkOrderValidationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(work_order).data)
