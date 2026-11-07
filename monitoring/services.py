from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from hidroscan.models import Device

from .models import Reading


class ReadingValidationError(ValueError):
    pass


def registrar_leitura(*, device, external_id, measured_at, volume):
    """Registra uma leitura com idempotência por dispositivo e identificador externo."""
    if measured_at > timezone.now():
        raise ReadingValidationError("A data da leitura não pode estar no futuro.")
    if volume < Decimal("0"):
        raise ReadingValidationError("O volume acumulado não pode ser negativo.")

    existing = Reading.objects.filter(device=device, external_id=external_id).first()
    if existing:
        return existing, False

    try:
        with transaction.atomic():
            locked_device = Device.objects.select_for_update().get(pk=device.pk, active=True)
            existing = Reading.objects.filter(device=locked_device, external_id=external_id).first()
            if existing:
                return existing, False

            previous = Reading.objects.filter(device=locked_device).order_by("-measured_at", "-id").first()
            if previous and measured_at <= previous.measured_at:
                raise ReadingValidationError("A data da leitura deve ser posterior à última leitura registrada.")
            if previous and volume < previous.volume:
                raise ReadingValidationError("O volume não pode ser menor que a leitura anterior.")

            consumption = volume - previous.volume if previous else Decimal("0")
            reading = Reading.objects.create(
                device=locked_device,
                external_id=external_id,
                measured_at=measured_at,
                volume=volume,
                consumption=consumption,
            )
            if locked_device.last_reading_at is None or measured_at >= locked_device.last_reading_at:
                locked_device.last_reading_at = measured_at
                locked_device.save(update_fields=["last_reading_at"])
            return reading, True
    except IntegrityError:
        reading = Reading.objects.get(device=device, external_id=external_id)
        return reading, False
