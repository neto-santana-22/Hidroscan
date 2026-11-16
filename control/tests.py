from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import AuditLog, Device, Property, Region, RegionAccess

from .admin import ValveCommandAdmin
from .models import ValveCommand


class ValveApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        self.technician = User.objects.create_user(
            email="tech@example.com", password="senha-segura-123", role=User.Role.TECNICO, email_verificado=True
        )
        self.admin = User.objects.create_user(
            email="admin@example.com", password="senha-segura-123", role=User.Role.ADMINISTRADOR
        )
        self.resident = User.objects.create_user(
            email="resident@example.com", password="senha-segura-123", role=User.Role.MORADOR
        )
        self.other_user = User.objects.create_user(
            email="other_tech@example.com", password="senha-segura-123", role=User.Role.TECNICO, email_verificado=True
        )

        self.region = Region.objects.create(name="Centro", code="centro")
        self.other_region = Region.objects.create(name="Sul", code="sul")

        RegionAccess.objects.create(user=self.technician, region=self.region)
        RegionAccess.objects.create(user=self.other_user, region=self.other_region)

        self.property = Property.objects.create(name="Casa", address="Rua 1", region=self.region, owner=self.resident)
        self.device = Device.objects.create(
            property=self.property, name="Hidrômetro", serial_number="V-001", device_key_hash="unused", active=True
        )

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

    def test_technician_commands_valve_and_audits(self):
        self.client.force_authenticate(self.technician)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "open", "reason": "Religamento técnico."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.device.refresh_from_db()
        self.assertEqual(self.device.valve_state, Device.ValveState.OPEN)
        self.assertTrue(self.technician.audit_logs.filter(action="valve.commanded").exists())

    def test_admin_commands_valve_and_audits(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Decisão administrativa."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.device.refresh_from_db()
        self.assertEqual(self.device.valve_state, Device.ValveState.CLOSED)
        self.assertTrue(self.admin.audit_logs.filter(action="valve.commanded").exists())

    def test_resident_can_read_but_cannot_command_valve(self):
        self.client.force_authenticate(self.resident)
        response = self.client.get(f"/api/dispositivos/{self.device.pk}/valvula/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["device"], self.device.pk)
        self.assertEqual(response.data["state"], self.device.valve_state)

        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Tentativa."}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access_valve(self):
        get_res = self.client.get(f"/api/dispositivos/{self.device.pk}/valvula/")
        self.assertIn(get_res.status_code, [401, 403])

        post_res = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Tentativa."}, format="json"
        )
        self.assertIn(post_res.status_code, [401, 403])

    def test_out_of_scope_device_returns_404(self):
        self.client.force_authenticate(self.other_user)
        get_res = self.client.get(f"/api/dispositivos/{self.device.pk}/valvula/")
        self.assertEqual(get_res.status_code, 404)

        post_res = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Tentativa fora de escopo."}, format="json"
        )
        self.assertEqual(post_res.status_code, 404)

    def test_command_inactive_device_returns_400(self):
        self.device.active = False
        self.device.save(update_fields=["active"])

        self.client.force_authenticate(self.operator)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": "Tentativa em inativo."}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("inativo", response.data["detail"].lower())

    def test_command_valve_requires_reason(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close", "reason": ""}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("reason", response.data)

        response_no_reason = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "close"}, format="json"
        )
        self.assertEqual(response_no_reason.status_code, 400)
        self.assertIn("reason", response_no_reason.data)

    def test_command_valve_invalid_action(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            f"/api/dispositivos/{self.device.pk}/valvula/", {"action": "invalid_action", "reason": "Teste."}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("action", response.data)

    def test_valve_command_admin_audit(self):
        site = AdminSite()
        admin_class = ValveCommandAdmin(ValveCommand, site)
        rf = RequestFactory()
        req = rf.post("/admin/control/valvecommand/add/")
        req.user = self.admin

        cmd = ValveCommand(device=self.device, requested_by=self.operator, action="close", reason="Admin test")
        admin_class.save_model(req, cmd, None, change=False)
        self.assertTrue(AuditLog.objects.filter(action="valve_command.created", resource_id=str(cmd.pk)).exists())

        cmd.reason = "Admin test updated"
        admin_class.save_model(req, cmd, None, change=True)
        self.assertTrue(AuditLog.objects.filter(action="valve_command.updated", resource_id=str(cmd.pk)).exists())

        cmd_id = str(cmd.pk)
        admin_class.delete_model(req, cmd)
        self.assertTrue(AuditLog.objects.filter(action="valve_command.deleted", resource_id=cmd_id).exists())

        cmd2 = ValveCommand.objects.create(device=self.device, requested_by=self.operator, action="open", reason="Bulk test")
        cmd2_id = str(cmd2.pk)
        admin_class.delete_queryset(req, ValveCommand.objects.filter(pk=cmd2.pk))
        self.assertTrue(AuditLog.objects.filter(action="valve_command.deleted", resource_id=cmd2_id).exists())
