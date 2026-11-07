from django.db import transaction

from hidroscan.services import register_audit

from .models import WorkOrder


class WorkOrderValidationError(ValueError):
    pass


VALID_TRANSITIONS = {
    WorkOrder.Status.PENDING: {WorkOrder.Status.IN_PROGRESS, WorkOrder.Status.CANCELED},
    WorkOrder.Status.IN_PROGRESS: {WorkOrder.Status.COMPLETED, WorkOrder.Status.CANCELED},
    WorkOrder.Status.COMPLETED: set(),
    WorkOrder.Status.CANCELED: set(),
}


def create_work_order(*, actor, **data):
    with transaction.atomic():
        work_order = WorkOrder.objects.create(created_by=actor, **data)
        register_audit(actor=actor, action="work_order.created", resource=work_order)
    return work_order


def change_status(*, work_order, actor, new_status):
    if new_status != work_order.status and new_status not in VALID_TRANSITIONS[work_order.status]:
        raise WorkOrderValidationError("Transição de status inválida.")
    with transaction.atomic():
        work_order.status = new_status
        work_order.save(update_fields=["status", "updated_at"])
        register_audit(actor=actor, action="work_order.updated", resource=work_order, details={"status": new_status})
    return work_order
