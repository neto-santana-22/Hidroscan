from django.test import TestCase
from rest_framework.test import APIClient

from .models import User


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="morador@example.com",
            password="senha-segura-123",
            role=User.Role.MORADOR,
        )

    def test_login_returns_authenticated_user_and_creates_audit_record(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "senha-segura-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["role"], User.Role.MORADOR)
        self.assertTrue(self.client.session.get("_auth_user_id"))
        self.assertTrue(self.user.audit_logs.filter(action="auth.login").exists())

    def test_unverified_technician_cannot_login(self):
        technician = User.objects.create_user(
            email="tecnico@example.com",
            password="senha-segura-123",
            role=User.Role.TECNICO,
            email_verificado=False,
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": technician.email, "password": "senha-segura-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("verificado", response.data["detail"])

    def test_login_requires_csrf_token_when_checks_are_enforced(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        response = csrf_client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "senha-segura-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

        csrf_client.get("/api/auth/csrf/")
        token = csrf_client.cookies["csrftoken"].value
        response = csrf_client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "senha-segura-123"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
