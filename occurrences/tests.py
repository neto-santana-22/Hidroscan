from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from hidroscan.models import Property, Region

from .models import Occurrence


class OccurrenceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR, todas_regioes=True
        )
        owner = User.objects.create_user(email="owner@example.com", password="senha-segura-123")
        region = Region.objects.create(name="Centro", code="centro")
        self.property = Property.objects.create(name="Casa", address="Rua 1", region=region, owner=owner)
        self.client.force_authenticate(self.operator)

    def test_create_and_resolve_occurrence(self):
        response = self.client.post(
            "/api/ocorrencias/", {"property": self.property.id, "title": "Vazamento", "description": "Verificar."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        occurrence = Occurrence.objects.get()
        response = self.client.post(
            f"/api/ocorrencias/{occurrence.id}/atualizacoes/",
            {"message": "Atendimento concluído.", "status": "resolved"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        occurrence.refresh_from_db()
        self.assertEqual(occurrence.status, Occurrence.Status.RESOLVED)
        self.assertEqual(occurrence.updates.count(), 2)
