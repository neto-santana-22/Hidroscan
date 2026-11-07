import uuid

from django.db import models


class Reading(models.Model):
    """Leitura acumulada recebida de um hidrômetro."""

    device = models.ForeignKey("hidroscan.Device", on_delete=models.CASCADE, related_name="readings")
    external_id = models.UUIDField(default=uuid.uuid4)
    measured_at = models.DateTimeField()
    volume = models.DecimalField(max_digits=12, decimal_places=3)
    consumption = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-measured_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["device", "external_id"], name="unique_reading_external_id_per_device"),
        ]
        indexes = [models.Index(fields=["device", "measured_at"])]

    def __str__(self):
        return f"{self.device} em {self.measured_at.isoformat()}"
