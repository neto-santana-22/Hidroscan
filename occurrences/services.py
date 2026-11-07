from django.db import transaction

from hidroscan.services import register_audit

from .models import Occurrence, OccurrenceUpdate


class OccurrenceValidationError(ValueError):
    pass


VALID_TRANSITIONS = {
    Occurrence.Status.OPEN: {Occurrence.Status.IN_PROGRESS, Occurrence.Status.RESOLVED},
    Occurrence.Status.IN_PROGRESS: {Occurrence.Status.RESOLVED},
    Occurrence.Status.RESOLVED: set(),
}


def create_occurrence(*, actor, property, title, description, alert=None):
    if alert and alert.property_id != property.pk:
        raise OccurrenceValidationError("O alerta deve pertencer ao mesmo imóvel.")
    with transaction.atomic():
        occurrence = Occurrence.objects.create(
            property=property, alert=alert, title=title, description=description, created_by=actor
        )
        OccurrenceUpdate.objects.create(
            occurrence=occurrence, author=actor, message="Ocorrência aberta.", status=occurrence.status
        )
        register_audit(actor=actor, action="occurrence.created", resource=occurrence)
    return occurrence


def add_update(*, occurrence, actor, message, status):
    if status != occurrence.status and status not in VALID_TRANSITIONS[occurrence.status]:
        raise OccurrenceValidationError("Transição de status inválida.")
    with transaction.atomic():
        occurrence.status = status
        occurrence.save(update_fields=["status", "updated_at"])
        update = OccurrenceUpdate.objects.create(
            occurrence=occurrence, author=actor, message=message, status=status
        )
        register_audit(actor=actor, action="occurrence.updated", resource=occurrence, details={"status": status})
    return update
