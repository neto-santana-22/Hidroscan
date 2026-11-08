from django.db import transaction

from hidroscan.models import Device
from hidroscan.services import register_audit

from .models import ValveCommand


def command_valve(*, device, actor, action, reason):
    """Persiste o comando, atualiza o estado conhecido e audita a mesma transação."""
    with transaction.atomic():
        locked_device = Device.objects.select_for_update().get(pk=device.pk, active=True)
        new_state = Device.ValveState.OPEN if action == ValveCommand.Action.OPEN else Device.ValveState.CLOSED
        command = ValveCommand.objects.create(device=locked_device, requested_by=actor, action=action, reason=reason)
        locked_device.valve_state = new_state
        locked_device.save(update_fields=["valve_state"])
        register_audit(
            actor=actor,
            action="valve.commanded",
            resource=command,
            details={"device_id": locked_device.pk, "action": action, "reason": reason},
        )
    return command
