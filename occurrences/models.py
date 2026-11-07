from django.conf import settings
from django.db import models


class Occurrence(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Aberta"
        IN_PROGRESS = "in_progress", "Em andamento"
        RESOLVED = "resolved", "Resolvida"

    property = models.ForeignKey("hidroscan.Property", on_delete=models.CASCADE, related_name="occurrences")
    alert = models.ForeignKey("alerts.Alert", on_delete=models.SET_NULL, null=True, blank=True, related_name="occurrences")
    title = models.CharField(max_length=160)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_occurrences")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class OccurrenceUpdate(models.Model):
    occurrence = models.ForeignKey(Occurrence, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="occurrence_updates")
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Occurrence.Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
