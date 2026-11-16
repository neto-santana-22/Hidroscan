from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import AuditLog, Device, Property, Region, RegionAccess
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


class AlertApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123", role=User.Role.MORADOR)
        self.operator = User.objects.create_user(email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR)
        self.region_a = Region.objects.create(name="Região A", code="reg-a")
        self.region_b = Region.objects.create(name="Região B", code="reg-b")
        RegionAccess.objects.create(user=self.operator, region=self.region_a)

        self.prop_a = Property.objects.create(name="Casa A", address="Rua A", region=self.region_a, owner=self.owner)
        self.prop_b = Property.objects.create(name="Casa B", address="Rua B", region=self.region_b, owner=self.owner)

        self.device_a = Device.objects.create(property=self.prop_a, name="Hidrô A", serial_number="HA-001")
        self.device_b = Device.objects.create(property=self.prop_b, name="Hidrô B", serial_number="HB-001")

        now = timezone.now()
        self.alert_a = Alert.objects.create(
            property=self.prop_a,
            device=self.device_a,
            rule_code="consumption_spike",
            title="Consumo anômalo",
            description="Pico detectado",
            severity=Alert.Severity.HIGH,
            status=Alert.Status.OPEN,
            first_detected_at=now,
            last_detected_at=now,
        )
        self.alert_b = Alert.objects.create(
            property=self.prop_b,
            device=self.device_b,
            rule_code="consumption_spike",
            title="Consumo anômalo B",
            description="Pico detectado B",
            severity=Alert.Severity.MEDIUM,
            status=Alert.Status.OPEN,
            first_detected_at=now,
            last_detected_at=now,
        )

    def test_list_alerts_respects_regional_scope(self):
        self.client.force_authenticate(self.operator)
        response = self.client.get("/api/alertas/")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data.get("results", response.data)]
        self.assertIn(self.alert_a.id, ids)
        self.assertNotIn(self.alert_b.id, ids)

    def test_filter_alerts_by_status(self):
        self.client.force_authenticate(self.operator)
        response = self.client.get("/api/alertas/?status=open")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data.get("results", response.data)]
        self.assertIn(self.alert_a.id, ids)

        response = self.client.get("/api/alertas/?status=resolved")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data.get("results", response.data)]
        self.assertNotIn(self.alert_a.id, ids)

    def test_acknowledge_alert(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(f"/api/alertas/{self.alert_a.id}/reconhecer/")
        self.assertEqual(response.status_code, 200)
        self.alert_a.refresh_from_db()
        self.assertEqual(self.alert_a.status, Alert.Status.ACKNOWLEDGED)
        self.assertEqual(self.alert_a.acknowledged_by, self.operator)
        self.assertIsNotNone(self.alert_a.acknowledged_at)
        self.assertTrue(AuditLog.objects.filter(action="alert.acknowledged", resource_id=str(self.alert_a.id)).exists())

    def test_acknowledge_resolved_alert_fails(self):
        self.alert_a.status = Alert.Status.RESOLVED
        self.alert_a.save()
        self.client.force_authenticate(self.operator)
        response = self.client.post(f"/api/alertas/{self.alert_a.id}/reconhecer/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_resolve_alert(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(f"/api/alertas/{self.alert_a.id}/resolver/")
        self.assertEqual(response.status_code, 200)
        self.alert_a.refresh_from_db()
        self.assertEqual(self.alert_a.status, Alert.Status.RESOLVED)
        self.assertTrue(AuditLog.objects.filter(action="alert.resolved", resource_id=str(self.alert_a.id)).exists())

    def test_resident_cannot_acknowledge_or_resolve_alert(self):
        self.client.force_authenticate(self.owner)
        res_rec = self.client.post(f"/api/alertas/{self.alert_a.id}/reconhecer/")
        self.assertEqual(res_rec.status_code, 403)
        res_res = self.client.post(f"/api/alertas/{self.alert_a.id}/resolver/")
        self.assertEqual(res_res.status_code, 403)
