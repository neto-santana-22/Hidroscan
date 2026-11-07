from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Property, Region

from .models import ResidentRequest


class ResidentRequestApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        region = Region.objects.create(name="Centro", code="centro")
        self.property = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=self.owner)

    def test_resident_creates_request_and_operator_concludes_it(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            "/api/solicitacoes/", {"property": self.property.id, "category": "leak", "description": "Há um vazamento."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        resident_request = ResidentRequest.objects.get()

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
