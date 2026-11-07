from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import User
from hidroscan.models import Device, Property, Region
from monitoring.services import registrar_leitura

from .models import Alert
from .rules import detect_consumption_spike


class AlertRuleTests(TestCase):
    def test_consumption_rule_is_pure(self):
        self.assertIsNone(detect_consumption_spike(consumption=Decimal("0.500"), threshold=Decimal("1.000")))
        anomaly = detect_consumption_spike(consumption=Decimal("1.000"), threshold=Decimal("1.000"))
        self.assertEqual(anomaly.rule_code, "consumption_spike")

    @override_settings(ALERT_CONSUMPTION_THRESHOLD=Decimal("1.000"))
    def test_engine_creates_then_updates_one_open_alert(self):
        owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        property_instance = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=owner)
        device = Device.objects.create(property=property_instance, name="Hidrômetro", serial_number="A-001")
        device.set_device_key("device-key-for-tests-123")
        device.save(update_fields=["device_key_hash"])
        start = timezone.now() - timedelta(minutes=3)
        registrar_leitura(device=device, external_id=uuid4(), measured_at=start, volume=Decimal("1.000"))
        registrar_leitura(device=device, external_id=uuid4(), measured_at=start + timedelta(minutes=1), volume=Decimal("2.500"))
        registrar_leitura(device=device, external_id=uuid4(), measured_at=start + timedelta(minutes=2), volume=Decimal("4.000"))

        alert = Alert.objects.get()
        self.assertEqual(Alert.objects.count(), 1)
        self.assertEqual(alert.occurrences_count, 2)
