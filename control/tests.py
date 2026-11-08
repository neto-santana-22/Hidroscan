from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Device, Property, Region

from .models import ValveCommand


class ValveApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        self.resident = User.objects.create_user(email="resident@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        property_instance = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=self.resident)
        self.device = Device.objects.create(property=property_instance, name="Hidrômetro", serial_number="V-001", device_key_hash="unused")

    def test_operator_commands_valve_and_audits_operation(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Manutenção."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.device.refresh_from_db()
        self.assertEqual(self.device.valve_state, Device.ValveState.CLOSED)
        self.assertEqual(ValveCommand.objects.count(), 1)
        self.assertTrue(self.operator.audit_logs.filter(action="valve.commanded").exists())

    def test_resident_can_read_but_cannot_command_valve(self):
        self.client.force_authenticate(self.resident)
        response = self.client.get(f"/api/dispositivos/{self.device.pk}/valvula/")
        self.assertEqual(response.status_code, 200)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Tentativa."}, format="json"
        )
        self.assertEqual(response.status_code, 403)
