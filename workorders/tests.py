from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import AuditLog, Property, Region, RegionAccess
from occurrences.models import Occurrence

from .models import WorkOrder


class WorkOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        self.technician = User.objects.create_user(
            email="tech@example.com", password="senha-segura-123", role=User.Role.TECNICO, email_verificado=True
        )
        self.other_technician = User.objects.create_user(
            email="other_tech@example.com", password="senha-segura-123", role=User.Role.TECNICO, email_verificado=True
        )
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123", role=User.Role.MORADOR)

        self.region = Region.objects.create(name="Centro", code="centro")
        self.other_region = Region.objects.create(name="Sul", code="sul")
        RegionAccess.objects.create(user=self.technician, region=self.region)
        RegionAccess.objects.create(user=self.other_technician, region=self.other_region)

        self.property = Property.objects.create(name="Casa", address="Rua 1", region=self.region, owner=self.owner)
        self.occurrence = Occurrence.objects.create(
            property=self.property, title="Vazamento", description="Verificar.", created_by=self.operator
        )

    def test_assigned_technician_can_advance_order(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            "/api/ordens-servico/",
            {"occurrence": self.occurrence.id, "assigned_to": self.technician.id, "title": "Inspecionar", "description": "Ir ao local."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        work_order = WorkOrder.objects.get()

        self.client.force_authenticate(self.technician)
        response = self.client.post(f"/api/ordens-servico/{work_order.id}/status/", {"status": "in_progress"}, format="json")
        self.assertEqual(response.status_code, 200)
        work_order.refresh_from_db()
        self.assertEqual(work_order.status, WorkOrder.Status.IN_PROGRESS)
        self.assertTrue(AuditLog.objects.filter(action="work_order.updated", resource_id=str(work_order.id)).exists())

    def test_technician_cannot_see_or_advance_other_technician_order(self):
        work_order = WorkOrder.objects.create(
            occurrence=self.occurrence,
            assigned_to=self.technician,
            title="Ordem Tech 1",
            description="Exclusiva Tech 1",
            created_by=self.operator,
        )
        self.client.force_authenticate(self.other_technician)
        response_list = self.client.get("/api/ordens-servico/")
        self.assertEqual(response_list.status_code, 200)
        ids = [item["id"] for item in response_list.data.get("results", response_list.data)]
        self.assertNotIn(work_order.id, ids)

        response_status = self.client.post(f"/api/ordens-servico/{work_order.id}/status/", {"status": "in_progress"}, format="json")
        self.assertEqual(response_status.status_code, 404)

    def test_cannot_assign_technician_without_regional_access(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            "/api/ordens-servico/",
            {
                "occurrence": self.occurrence.id,
                "assigned_to": self.other_technician.id,
                "title": "Inspecionar",
                "description": "Tech sem acesso à região.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("assigned_to", response.data)

    def test_cannot_assign_non_technician_to_work_order(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            "/api/ordens-servico/",
            {
                "occurrence": self.occurrence.id,
                "assigned_to": self.owner.id,
                "title": "Inspecionar",
                "description": "Atribuindo morador.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("assigned_to", response.data)

    def test_invalid_status_transition_rejected(self):
        work_order = WorkOrder.objects.create(
            occurrence=self.occurrence,
            assigned_to=self.technician,
            title="Ordem",
            description="Teste transição inválida",
            created_by=self.operator,
            status=WorkOrder.Status.PENDING,
        )
        self.client.force_authenticate(self.technician)
        response = self.client.post(f"/api/ordens-servico/{work_order.id}/status/", {"status": "completed"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_direct_put_patch_delete_blocked(self):
        self.client.force_authenticate(self.operator)
        work_order = WorkOrder.objects.create(
            occurrence=self.occurrence,
            assigned_to=self.technician,
            title="Ordem",
            description="Desc",
            created_by=self.operator,
        )
        res_put = self.client.put(f"/api/ordens-servico/{work_order.id}/", {"title": "Novo"}, format="json")
        self.assertEqual(res_put.status_code, 405)
        res_patch = self.client.patch(f"/api/ordens-servico/{work_order.id}/", {"status": "in_progress"}, format="json")
        self.assertEqual(res_patch.status_code, 405)
        res_delete = self.client.delete(f"/api/ordens-servico/{work_order.id}/")
        self.assertEqual(res_delete.status_code, 405)

    def test_morador_cannot_access_work_orders(self):
        self.client.force_authenticate(self.owner)
        res_get = self.client.get("/api/ordens-servico/")
        self.assertEqual(res_get.status_code, 403)
