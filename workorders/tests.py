from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Property, Region, RegionAccess
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
        owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        RegionAccess.objects.create(user=self.technician, region=region)
        property_instance = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=owner)
        self.occurrence = Occurrence.objects.create(
            property=property_instance, title="Vazamento", description="Verificar.", created_by=self.operator
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
