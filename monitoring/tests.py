from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Device, Property, Region, RegionAccess

from .models import Reading
from .services import ReadingValidationError, registrar_leitura


class ReadingServiceTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        property_instance = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=owner)
        self.device = Device.objects.create(property=property_instance, name="Hidrômetro", serial_number="H-001")
        self.device.set_device_key("device-key-for-tests-123")
        self.device.save(update_fields=["device_key_hash"])

    def test_registers_consumption_and_is_idempotent(self):
        first, first_created = registrar_leitura(
            device=self.device,
            external_id=uuid4(),
            measured_at=timezone.now() - timedelta(minutes=2),
            volume=Decimal("12.000"),
        )
        external_id = uuid4()
        second, second_created = registrar_leitura(
            device=self.device,
            external_id=external_id,
            measured_at=timezone.now() - timedelta(minutes=1),
            volume=Decimal("12.750"),
        )
        duplicate, duplicate_created = registrar_leitura(
            device=self.device,
            external_id=external_id,
            measured_at=timezone.now() - timedelta(minutes=1),
            volume=Decimal("12.750"),
        )

        self.assertTrue(first_created)
        self.assertEqual(first.consumption, Decimal("0"))
        self.assertTrue(second_created)
        self.assertEqual(second.consumption, Decimal("0.750"))
        self.assertFalse(duplicate_created)
        self.assertEqual(duplicate.pk, second.pk)

    def test_rejects_regressive_volume(self):
        registrar_leitura(
            device=self.device,
            external_id=uuid4(),
            measured_at=timezone.now() - timedelta(minutes=2),
            volume=Decimal("5.000"),
        )
        with self.assertRaises(ReadingValidationError):
            registrar_leitura(
                device=self.device,
                external_id=uuid4(),
                measured_at=timezone.now() - timedelta(minutes=1),
                volume=Decimal("4.000"),
            )

    def test_rejects_out_of_order_reading(self):
        latest_at = timezone.now() - timedelta(minutes=1)
        registrar_leitura(
            device=self.device,
            external_id=uuid4(),
            measured_at=latest_at,
            volume=Decimal("5.000"),
        )
        with self.assertRaises(ReadingValidationError):
            registrar_leitura(
                device=self.device,
                external_id=uuid4(),
                measured_at=latest_at - timedelta(minutes=1),
                volume=Decimal("4.500"),
            )


class ReadingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR
        )
        region = Region.objects.create(name="Centro", code="centro")
        self.property_instance = Property.objects.create(
            name="Casa", address="Rua 1", region=region, owner=self.owner
        )
        RegionAccess.objects.create(user=self.operator, region=region)
        self.device = Device.objects.create(property=self.property_instance, name="Hidrômetro", serial_number="H-001")
        self.raw_key = "device-key-for-tests-123"
        self.device.set_device_key(self.raw_key)
        self.device.save(update_fields=["device_key_hash"])

    def test_ingestion_requires_device_key_and_returns_duplicate_status(self):
        payload = {"external_id": str(uuid4()), "measured_at": timezone.now().isoformat(), "volume": "20.000"}
        response = self.client.post("/api/leituras/", payload, format="json")
        self.assertEqual(response.status_code, 401)

        response = self.client.post("/api/leituras/", payload, format="json", HTTP_X_DEVICE_KEY=self.raw_key)
        self.assertEqual(response.status_code, 201)
        response = self.client.post("/api/leituras/", payload, format="json", HTTP_X_DEVICE_KEY=self.raw_key)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Reading.objects.count(), 1)

    def test_consumption_uses_property_scope(self):
        registrar_leitura(
            device=self.device,
            external_id=uuid4(),
            measured_at=timezone.now() - timedelta(minutes=2),
            volume=Decimal("20.000"),
        )
        registrar_leitura(
            device=self.device,
            external_id=uuid4(),
            measured_at=timezone.now() - timedelta(minutes=1),
            volume=Decimal("21.500"),
        )
        self.client.force_authenticate(user=self.operator)

        response = self.client.get(f"/api/imoveis/{self.property_instance.pk}/consumo/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["consumption"]), Decimal("1.500"))
