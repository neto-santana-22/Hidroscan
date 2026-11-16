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


class DeviceAdminFormTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin_device_test@example.com",
            password="admin-password-123",
        )
        self.region = Region.objects.create(name="Região Admin", code="reg-admin")
        self.prop = Property.objects.create(
            name="Imóvel Admin", address="Rua Admin 100", region=self.region, owner=self.admin
        )

    def test_device_admin_form_and_admin_save(self):
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory
        from .admin import DeviceAdmin
        from .forms import DeviceAdminForm
        from .models import AuditLog

        site = AdminSite()
        da = DeviceAdmin(Device, site)
        rf = RequestFactory()
        req = rf.post("/admin/hidroscan/device/add/")
        req.user = self.admin

        form = DeviceAdminForm(
            data={
                "property": self.prop.pk,
                "name": "Hidrômetro Admin Form",
                "serial_number": "HIDRO-ADM-FORM-01",
                "active": True,
                "device_key": "chave-secreta-456",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)
        device = form.save(commit=False)
        da.save_model(req, device, form, change=False)

        device.refresh_from_db()
        self.assertTrue(device.check_device_key("chave-secreta-456"))
        self.assertTrue(
            AuditLog.objects.filter(action="device.created", resource_id=str(device.pk)).exists()
        )


class SeedDemoCommandTests(TestCase):
    def test_seed_demo_creates_all_entities_idempotently(self):
        from django.core.management import call_command
        from io import StringIO
        from monitoring.models import Reading

        out = StringIO()
        call_command("seed_demo", stdout=out)
        self.assertIn("seed_demo", out.getvalue())

        # Verifica existência dos 4 usuários
        self.assertTrue(User.objects.filter(email="admin@hidroscan.local", role=User.Role.ADMINISTRADOR).exists())
        self.assertTrue(User.objects.filter(email="operador@hidroscan.local", role=User.Role.OPERADOR).exists())
        self.assertTrue(User.objects.filter(email="tecnico@hidroscan.local", role=User.Role.TECNICO).exists())
        self.assertTrue(User.objects.filter(email="morador@hidroscan.local", role=User.Role.MORADOR).exists())

        # Verifica região, imóvel e dispositivo
        region = Region.objects.get(code="central")
        prop = Property.objects.get(name="Condomínio das Águas", region=region)
        device = Device.objects.get(serial_number="HIDRO-001", property=prop)
        self.assertTrue(device.check_device_key("chave-demo-123"))

        # Verifica leituras geradas
        readings_count = Reading.objects.filter(device=device).count()
        self.assertEqual(readings_count, 12)

        # Idempotência: rodar novamente não duplica nem lança erro
        out2 = StringIO()
        call_command("seed_demo", stdout=out2)
        self.assertEqual(Reading.objects.filter(device=device).count(), 12)
        self.assertEqual(User.objects.filter(email="admin@hidroscan.local").count(), 1)
