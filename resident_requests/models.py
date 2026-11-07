from django.conf import settings
from django.db import models


class ResidentRequest(models.Model):
    class Category(models.TextChoices):
        LEAK = "leak", "Vazamento"
        METER = "meter", "Hidrômetro"
        BILLING = "billing", "Consumo/faturamento"
        OTHER = "other", "Outro"

    class Status(models.TextChoices):
        OPEN = "open", "Aberta"
        UNDER_REVIEW = "under_review", "Em análise"
        COMPLETED = "completed", "Concluída"
        CANCELED = "canceled", "Cancelada"

    property = models.ForeignKey("hidroscan.Property", on_delete=models.CASCADE, related_name="resident_requests")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="resident_requests")
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
