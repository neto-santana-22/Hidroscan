from django.db import transaction

from .models import AuditLog, Device


def register_audit(*, actor, action, resource, details=None):
    return AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        resource_type=resource._meta.label_lower,
        resource_id=str(resource.pk),
        details=details or {},
    )


def create_device(*, property, name, serial_number, device_key, actor, active=True):
    with transaction.atomic():
        device = Device(property=property, name=name, serial_number=serial_number, active=active)
        device.set_device_key(device_key)
        device.save()
        register_audit(actor=actor, action="device.created", resource=device)
    return device
