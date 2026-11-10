from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

from .models import Device, Property, Region, RegionAccess


class ScopeAndDeviceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="senha-segura-123",
            role=User.Role.ADMINISTRADOR,
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="senha-segura-123",
            role=User.Role.MORADOR,
        )
        self.operator = User.objects.create_user(
            email="operator@example.com",
            password="senha-segura-123",
            role=User.Role.OPERADOR,
        )
        region_a = Region.objects.create(name="Região A", code="a")
        region_b = Region.objects.create(name="Região B", code="b")
        self.visible_property = Property.objects.create(
            name="Imóvel A",
            address="Rua A, 1",
            region=region_a,
            owner=self.owner,
        )
        Property.objects.create(
            name="Imóvel B",
            address="Rua B, 2",
            region=region_b,
            owner=self.admin,
        )
        RegionAccess.objects.create(user=self.operator, region=region_a)

    def test_resident_only_lists_owned_properties(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/imoveis/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["results"]], [self.visible_property.id])

    def test_operator_only_lists_properties_in_assigned_regions(self):
        self.client.force_authenticate(user=self.operator)
        response = self.client.get("/api/imoveis/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["results"]], [self.visible_property.id])

    def test_admin_can_create_device_without_returning_its_key(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/dispositivos/",
            {
                "property": self.visible_property.id,
                "name": "Hidrômetro A",
                "serial_number": "HIDRO-A-001",
                "device_key": "chave-de-dispositivo-1234",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("device_key", response.data)
        device = Device.objects.get(pk=response.data["id"])
        self.assertTrue(device.check_device_key("chave-de-dispositivo-1234"))
        self.assertTrue(self.admin.audit_logs.filter(action="device.created").exists())

    def test_admin_can_create_an_inactive_device_but_cannot_set_valve_state(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/dispositivos/",
            {
                "property": self.visible_property.id,
                "name": "Hidrômetro inativo",
                "serial_number": "HIDRO-A-002",
                "device_key": "chave-de-dispositivo-1234",
                "active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(Device.objects.get(pk=response.data["id"]).active)

        response = self.client.post(
            "/api/dispositivos/",
            {
                "property": self.visible_property.id,
                "name": "Hidrômetro indevido",
                "serial_number": "HIDRO-A-003",
                "device_key": "chave-de-dispositivo-1234",
                "valve_state": "open",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valve_state", response.data)
