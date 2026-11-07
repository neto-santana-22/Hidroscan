from django.db import transaction

from hidroscan.services import register_audit

from .models import ResidentRequest


class ResidentRequestValidationError(ValueError):
    pass


VALID_TRANSITIONS = {
    ResidentRequest.Status.OPEN: {ResidentRequest.Status.UNDER_REVIEW, ResidentRequest.Status.CANCELED},
    ResidentRequest.Status.UNDER_REVIEW: {ResidentRequest.Status.COMPLETED, ResidentRequest.Status.CANCELED},
    ResidentRequest.Status.COMPLETED: set(),
    ResidentRequest.Status.CANCELED: set(),
}


def create_request(*, actor, property, category, description):
    with transaction.atomic():
        request = ResidentRequest.objects.create(
            property=property, requester=actor, category=category, description=description
        )
        register_audit(actor=actor, action="resident_request.created", resource=request)
    return request


def change_status(*, request, actor, status, resolution=""):
    if status != request.status and status not in VALID_TRANSITIONS[request.status]:
        raise ResidentRequestValidationError("Transição de status inválida.")
    if status == ResidentRequest.Status.COMPLETED and not resolution:
        raise ResidentRequestValidationError("A resolução é obrigatória ao concluir uma solicitação.")
    with transaction.atomic():
        request.status = status
        if resolution:
            request.resolution = resolution
        request.save(update_fields=["status", "resolution", "updated_at"])
        register_audit(actor=actor, action="resident_request.updated", resource=request, details={"status": status})
    return request
