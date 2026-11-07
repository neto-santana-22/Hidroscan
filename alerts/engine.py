from django.conf import settings
from django.db import IntegrityError, transaction

from .models import Alert
from .rules import detect_consumption_spike


def evaluate_reading(reading):
    anomaly = detect_consumption_spike(
        consumption=reading.consumption,
        threshold=settings.ALERT_CONSUMPTION_THRESHOLD,
    )
    if anomaly is None:
        return None
    return create_or_update_alert(reading=reading, anomaly=anomaly)


def create_or_update_alert(*, reading, anomaly):
    try:
        with transaction.atomic():
            alert = Alert.objects.select_for_update().filter(
                device=reading.device,
                rule_code=anomaly.rule_code,
                status=Alert.Status.OPEN,
            ).first()
            if alert:
                alert.last_detected_at = reading.measured_at
                alert.occurrences_count += 1
                alert.description = anomaly.description
                alert.severity = anomaly.severity
                alert.save(update_fields=["last_detected_at", "occurrences_count", "description", "severity"])
                return alert, False
            return (
                Alert.objects.create(
                    property=reading.device.property,
                    device=reading.device,
                    rule_code=anomaly.rule_code,
                    title=anomaly.title,
                    description=anomaly.description,
                    severity=anomaly.severity,
                    first_detected_at=reading.measured_at,
                    last_detected_at=reading.measured_at,
                ),
                True,
            )
    except IntegrityError:
        return Alert.objects.get(device=reading.device, rule_code=anomaly.rule_code, status=Alert.Status.OPEN), False
