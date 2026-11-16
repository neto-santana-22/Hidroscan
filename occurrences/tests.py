from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from alerts.models import Alert
from hidroscan.models import AuditLog, Device, Property, Region, RegionAccess

from .models import Occurrence


class OccurrenceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            email="operator@example.com", password="senha-segura-123", role=User.Role.OPERADOR
        )
        self.owner = User.objects.create_user(
            email="owner@example.com", password="senha-segura-123", role=User.Role.MORADOR
        )
        self.region = Region.objects.create(name="Centro", code="centro")
        self.other_region = Region.objects.create(name="Norte", code="norte")
        RegionAccess.objects.create(user=self.operator, region=self.region)

        self.property = Property.objects.create(name="Casa", address="Rua 1", region=self.region, owner=self.owner)
        self.other_property = Property.objects.create(name="Casa Norte", address="Rua N", region=self.other_region, owner=self.owner)
        self.device = Device.objects.create(property=self.property, name="Hidrômetro", serial_number="A-001")

        now = timezone.now()
        self.alert = Alert.objects.create(
            property=self.property,
            device=self.device,
            rule_code="consumption_spike",
            title="Pico de Consumo",
            description="Consumo elevado",
            severity=Alert.Severity.HIGH,
            status=Alert.Status.OPEN,
            first_detected_at=now,
            last_detected_at=now,
        )

    def test_create_and_resolve_occurrence(self):
        self.client.force_authenticate(self.operator)
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

    def test_create_occurrence_linked_to_alert_and_resolution_resolves_alert(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            "/api/ocorrencias/",
            {"property": self.property.id, "alert": self.alert.id, "title": "Investigar Pico", "description": "Alerta gerou ocorrência."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        occurrence = Occurrence.objects.get(id=response.data["id"])
        self.assertEqual(occurrence.alert_id, self.alert.id)

        # Resolvendo a ocorrência deve resolver o alerta associado
        response = self.client.post(
            f"/api/ocorrencias/{occurrence.id}/atualizacoes/",
            {"message": "Vazamento reparado com sucesso.", "status": "resolved"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        occurrence.refresh_from_db()
        self.alert.refresh_from_db()
        self.assertEqual(occurrence.status, Occurrence.Status.RESOLVED)
        self.assertEqual(self.alert.status, Alert.Status.RESOLVED)
        self.assertTrue(AuditLog.objects.filter(action="alert.resolved", resource_id=str(self.alert.id)).exists())

    def test_cannot_create_occurrence_outside_regional_scope(self):
        self.client.force_authenticate(self.operator)
        response = self.client.post(
            "/api/ocorrencias/",
            {"property": self.other_property.id, "title": "Invasão de escopo", "description": "Tentativa fora de região."},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_cannot_create_occurrence_with_mismatched_alert_property(self):
        self.client.force_authenticate(self.operator)
        other_alert = Alert.objects.create(
            property=self.other_property,
            device=Device.objects.create(property=self.other_property, name="Hidrô N", serial_number="AN-001"),
            rule_code="consumption_spike",
            title="Alerta Outro",
            description="Outro",
            severity=Alert.Severity.LOW,
            status=Alert.Status.OPEN,
            first_detected_at=timezone.now(),
            last_detected_at=timezone.now(),
        )
        response = self.client.post(
            "/api/ocorrencias/",
            {"property": self.property.id, "alert": other_alert.id, "title": "Conflito", "description": "Alerta descasado."},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_direct_put_patch_delete_blocked(self):
        self.client.force_authenticate(self.operator)
        occurrence = Occurrence.objects.create(
            property=self.property, title="Teste", description="Desc", created_by=self.operator
        )
        res_put = self.client.put(f"/api/ocorrencias/{occurrence.id}/", {"title": "Novo"}, format="json")
        self.assertEqual(res_put.status_code, 405)
        res_patch = self.client.patch(f"/api/ocorrencias/{occurrence.id}/", {"status": "resolved"}, format="json")
        self.assertEqual(res_patch.status_code, 405)
        res_delete = self.client.delete(f"/api/ocorrencias/{occurrence.id}/")
        self.assertEqual(res_delete.status_code, 405)

    def test_invalid_status_transition_rejected(self):
        self.client.force_authenticate(self.operator)
        occurrence = Occurrence.objects.create(
            property=self.property, title="Teste", description="Desc", created_by=self.operator, status=Occurrence.Status.RESOLVED
        )
        response = self.client.post(
            f"/api/ocorrencias/{occurrence.id}/atualizacoes/",
            {"message": "Reabrindo?", "status": "open"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_morador_cannot_access_occurrences(self):
        self.client.force_authenticate(self.owner)
        res_get = self.client.get("/api/ocorrencias/")
        self.assertEqual(res_get.status_code, 403)
        res_post = self.client.post("/api/ocorrencias/", {"property": self.property.id, "title": "T"}, format="json")
        self.assertEqual(res_post.status_code, 403)
