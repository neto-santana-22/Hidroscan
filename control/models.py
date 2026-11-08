from django.conf import settings
from django.db import models


class ValveCommand(models.Model):
    class Action(models.TextChoices):
        OPEN = "open", "Abrir"
        CLOSE = "close", "Fechar"

    class Status(models.TextChoices):
        APPLIED = "applied", "Aplicado"
        REJECTED = "rejected", "Rejeitado"

    device = models.ForeignKey("hidroscan.Device", on_delete=models.CASCADE, related_name="valve_commands")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="valve_commands")
    action = models.CharField(max_length=8, choices=Action.choices)
    reason = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.APPLIED)
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-requested_at"]
