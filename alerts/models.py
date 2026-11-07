from django.conf import settings
from django.db import models


class Alert(models.Model):
    class Severity(models.TextChoices):
        LOW = "low", "Baixa"
        MEDIUM = "medium", "Média"
        HIGH = "high", "Alta"
        CRITICAL = "critical", "Crítica"

    class Status(models.TextChoices):
        OPEN = "open", "Aberto"
        ACKNOWLEDGED = "acknowledged", "Reconhecido"
        RESOLVED = "resolved", "Resolvido"

    property = models.ForeignKey("hidroscan.Property", on_delete=models.CASCADE, related_name="alerts")
    device = models.ForeignKey("hidroscan.Device", on_delete=models.CASCADE, related_name="alerts")
    rule_code = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    description = models.TextField()
    severity = models.CharField(max_length=16, choices=Severity.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    first_detected_at = models.DateTimeField()
    last_detected_at = models.DateTimeField()
    occurrences_count = models.PositiveIntegerField(default=1)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="acknowledged_alerts"
    )

    class Meta:
        ordering = ["-last_detected_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["device", "rule_code"],
                condition=models.Q(status="open"),
                name="unique_open_alert_per_device_rule",
            ),
        ]

    def __str__(self):
        return f"{self.rule_code}: {self.device}"
