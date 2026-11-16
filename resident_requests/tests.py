from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import AuditLog, Property, Region

from .models import ResidentRequest


class ResidentRequestApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123", role=User.Role.MORADOR)
        self.other_owner = User.objects.create_user(email="other@example.com", password="senha-segura-123", role=User.Role.MORADOR)
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        region = Region.objects.create(name="Centro", code="centro")
        self.property = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=self.owner)
        self.other_property = Property.objects.create(name="Casa 2", address="Rua 2", region=region, owner=self.other_owner)

    def test_resident_creates_request_and_operator_concludes_it(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            "/api/solicitacoes/", {"property": self.property.id, "category": "leak", "description": "Há um vazamento."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        resident_request = ResidentRequest.objects.get()
        self.assertTrue(AuditLog.objects.filter(action="resident_request.created", resource_id=str(resident_request.id)).exists())

        self.client.force_authenticate(self.operator)
        response = self.client.post(
            f"/api/solicitacoes/{resident_request.id}/status/", {"status": "under_review"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        response = self.client.post(
            f"/api/solicitacoes/{resident_request.id}/status/", {"status": "completed", "resolution": "Reparo agendado."}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        resident_request.refresh_from_db()
        self.assertEqual(resident_request.status, ResidentRequest.Status.COMPLETED)
        self.assertEqual(resident_request.resolution, "Reparo agendado.")
        self.assertTrue(AuditLog.objects.filter(action="resident_request.updated", resource_id=str(resident_request.id)).exists())

    def test_concluding_request_without_resolution_fails(self):
        self.client.force_authenticate(self.owner)
        self.client.post(
            "/api/solicitacoes/", {"property": self.property.id, "category": "leak", "description": "Vazamento."}, format="json"
        )
        resident_request = ResidentRequest.objects.get()

        self.client.force_authenticate(self.operator)
        self.client.post(f"/api/solicitacoes/{resident_request.id}/status/", {"status": "under_review"}, format="json")

        # Conclusão sem resolução deve falhar com 400
        response = self.client.post(
            f"/api/solicitacoes/{resident_request.id}/status/", {"status": "completed"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_invalid_status_transition_rejected(self):
        resident_request = ResidentRequest.objects.create(
            property=self.property, requester=self.owner, category="leak", description="Vazamento"
        )
        self.client.force_authenticate(self.operator)
        # Aberta -> Concluída direto é inválido
        response = self.client.post(
            f"/api/solicitacoes/{resident_request.id}/status/", {"status": "completed", "resolution": "Direto"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_resident_cannot_create_request_for_unowned_property(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            "/api/solicitacoes/", {"property": self.other_property.id, "category": "leak", "description": "Outro imóvel."}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_resident_cannot_call_set_status(self):
        resident_request = ResidentRequest.objects.create(
            property=self.property, requester=self.owner, category="leak", description="Vazamento"
        )
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            f"/api/solicitacoes/{resident_request.id}/status/", {"status": "under_review"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_direct_put_patch_delete_blocked(self):
        resident_request = ResidentRequest.objects.create(
            property=self.property, requester=self.owner, category="leak", description="Vazamento"
        )
        self.client.force_authenticate(self.operator)
        res_put = self.client.put(f"/api/solicitacoes/{resident_request.id}/", {"description": "Novo"}, format="json")
        self.assertEqual(res_put.status_code, 405)
        res_patch = self.client.patch(f"/api/solicitacoes/{resident_request.id}/", {"status": "completed"}, format="json")
        self.assertEqual(res_patch.status_code, 405)
        res_delete = self.client.delete(f"/api/solicitacoes/{resident_request.id}/")
        self.assertEqual(res_delete.status_code, 405)
