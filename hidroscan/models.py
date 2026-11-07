from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=40, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Property(models.Model):
    name = models.CharField(max_length=160)
    address = models.CharField(max_length=255)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="properties")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="properties")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Device(models.Model):
    class ValveState(models.TextChoices):
        OPEN = "open", "Aberta"
        CLOSED = "closed", "Fechada"
        UNKNOWN = "unknown", "Desconhecida"

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="devices")
    name = models.CharField(max_length=120)
    serial_number = models.CharField(max_length=80, unique=True)
    device_key_hash = models.CharField(max_length=128)
    valve_state = models.CharField(max_length=16, choices=ValveState.choices, default=ValveState.UNKNOWN)
    last_reading_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def set_device_key(self, raw_key):
        self.device_key_hash = make_password(raw_key)

    def check_device_key(self, raw_key):
        return check_password(raw_key, self.device_key_hash)

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class RegionAccess(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="region_accesses")
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="user_accesses")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "region"], name="unique_user_region_access")]


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValidationError("Registros de auditoria são imutáveis.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Registros de auditoria não podem ser removidos.")
