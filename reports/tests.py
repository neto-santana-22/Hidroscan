from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Device, Property, Region
from monitoring.services import registrar_leitura


class ReportApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        other_owner = User.objects.create_user(email="other@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        self.property = Property.objects.create(name="Casa A", address="Rua 1", region=region, owner=self.owner)
        other_property = Property.objects.create(name="Casa B", address="Rua 2", region=region, owner=other_owner)
        self.device = Device.objects.create(property=self.property, name="Medidor A", serial_number="R-001", device_key_hash="unused")
        other_device = Device.objects.create(property=other_property, name="Medidor B", serial_number="R-002", device_key_hash="unused")
        moment = timezone.now() - timedelta(minutes=2)
        registrar_leitura(device=self.device, external_id=uuid4(), measured_at=moment, volume=Decimal("1.000"))
        registrar_leitura(device=self.device, external_id=uuid4(), measured_at=moment + timedelta(minutes=1), volume=Decimal("2.000"))
        registrar_leitura(device=other_device, external_id=uuid4(), measured_at=moment, volume=Decimal("5.000"))
        registrar_leitura(device=other_device, external_id=uuid4(), measured_at=moment + timedelta(minutes=1), volume=Decimal("8.000"))

    def test_consumption_csv_is_scoped_to_resident(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get("/api/relatorios/consumo/?formato=csv")
        body = b"".join(response.streaming_content).decode()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("Casa A", body)
        self.assertNotIn("Casa B", body)
        self.assertTrue(self.owner.audit_logs.filter(action="report.exported").exists())

    def test_pdf_report_is_downloaded(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get("/api/relatorios/leituras/?formato=pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
