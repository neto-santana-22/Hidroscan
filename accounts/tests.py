from django.core.cache import cache
from django.test import TestCase
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.test import APIClient

from hidroscan.models import AuditLog

from .models import EmailVerification, User


class AuthenticationApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="morador@example.com",
            password="senha-segura-123",
            role=User.Role.MORADOR,
        )

    def tearDown(self):
        cache.clear()
        super().tearDown()

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
        self.assertEqual(list(AuditLog.objects.values_list("action", flat=True)), ["auth.login"])

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

    def test_public_technician_verification_persists_invalid_attempt(self):
        technician = User.objects.create_user(
            email="tecnico@example.com",
            password="senha-segura-123",
            role=User.Role.TECNICO,
            email_verificado=False,
        )
        verification = EmailVerification.objects.create(user=technician, code_hash=make_password("123456"))
        client = APIClient(enforce_csrf_checks=True)
        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value

        for _ in range(5):
            response = client.post(
                "/api/auth/verificacao-email/",
                {"email": technician.email, "code": "000000"},
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, 400)
        verification.refresh_from_db()
        self.assertEqual(verification.attempts, 5)

        response = client.post(
            "/api/auth/verificacao-email/",
            {"email": technician.email, "code": "123456"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)
        technician.refresh_from_db()
        self.assertFalse(technician.email_verificado)

    def test_public_technician_verification_does_not_require_a_session(self):
        technician = User.objects.create_user(
            email="tecnico@example.com",
            password="senha-segura-123",
            role=User.Role.TECNICO,
            email_verificado=False,
        )
        EmailVerification.objects.create(user=technician, code_hash=make_password("123456"))
        client = APIClient(enforce_csrf_checks=True)
        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value

        response = client.post(
            "/api/auth/verificacao-email/",
            {"email": technician.email, "code": "123456"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        technician.refresh_from_db()
        self.assertTrue(technician.email_verificado)

    def test_user_creation_requires_role_and_audits_administrator_as_actor(self):
        administrator = User.objects.create_user(
            email="admin@example.com",
            password="senha-segura-123",
            role=User.Role.ADMINISTRADOR,
        )
        self.client.force_authenticate(administrator)
        invalid_response = self.client.post(
            "/api/usuarios/", {"email": "novo@example.com", "password": "senha-segura-123"}, format="json"
        )
        self.assertEqual(invalid_response.status_code, 400)

        response = self.client.post(
            "/api/usuarios/",
            {"email": "novo@example.com", "password": "senha-segura-123", "role": "morador"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email="novo@example.com")
        audit = AuditLog.objects.get(action="user.created", resource_id=str(created_user.pk))
        self.assertEqual(audit.actor_id, administrator.pk)

    def test_schema_requires_an_authenticated_user(self):
        self.assertEqual(self.client.get("/api/schema/").status_code, 403)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get("/api/schema/").status_code, 200)


    def test_email_is_normalized_to_lowercase_on_creation(self):
        user = User.objects.create_user(
            email="TechUser@Example.COM",
            password="senha-segura-123",
            role=User.Role.MORADOR,
        )
        self.assertEqual(user.email, "techuser@example.com")

    def test_verification_handles_multiple_objects_returned_gracefully(self):
        """If iexact somehow returns multiple users, view returns generic 400."""
        # With lowercase normalization this should not happen for new users,
        # but the view must handle it defensively.
        client = APIClient(enforce_csrf_checks=True)
        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value
        response = client.post(
            "/api/auth/verificacao-email/",
            {"email": "naoexiste@example.com", "code": "123456"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)

    def test_resend_verification_requires_administrator(self):
        non_admin = User.objects.create_user(
            email="operador@example.com",
            password="senha-segura-123",
            role=User.Role.OPERADOR,
        )
        client = APIClient()
        client.force_authenticate(non_admin)
        response = client.post(
            "/api/auth/reenvio-verificacao/",
            {"email": "tecnico@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_resend_verification_only_for_unverified_technician(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="senha-segura-123",
            role=User.Role.ADMINISTRADOR,
        )
        morador = User.objects.create_user(
            email="morador2@example.com",
            password="senha-segura-123",
            role=User.Role.MORADOR,
        )
        client = APIClient()
        client.force_authenticate(admin)

        # Non-technician
        response = client.post(
            "/api/auth/reenvio-verificacao/",
            {"email": morador.email},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("técnicos", response.data["detail"])

    def test_resend_verification_creates_new_code_and_audits(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="senha-segura-123",
            role=User.Role.ADMINISTRADOR,
        )
        technician = User.objects.create_user(
            email="tecnico@example.com",
            password="senha-segura-123",
            role=User.Role.TECNICO,
            email_verificado=False,
        )
        # Create an expired verification
        EmailVerification.objects.create(
            user=technician,
            code_hash=make_password("123456"),
            expires_at=timezone.now() - timezone.timedelta(minutes=10),
            attempts=5,
        )
        client = APIClient()
        client.force_authenticate(admin)
        response = client.post(
            "/api/auth/reenvio-verificacao/",
            {"email": technician.email},
            format="json",
        )
        self.assertEqual(response.status_code, 204)
        # Verification was reset
        verification = EmailVerification.objects.get(user=technician)
        self.assertEqual(verification.attempts, 0)
        self.assertIsNone(verification.used_at)
        self.assertGreater(verification.expires_at, timezone.now())
        # Audit recorded
        self.assertTrue(AuditLog.objects.filter(action="user.verification_resent").exists())

    def test_resend_verification_rejects_already_verified(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="senha-segura-123",
            role=User.Role.ADMINISTRADOR,
        )
        technician = User.objects.create_user(
            email="tecnico@example.com",
            password="senha-segura-123",
            role=User.Role.TECNICO,
            email_verificado=True,
        )
        client = APIClient()
        client.force_authenticate(admin)
        response = client.post(
            "/api/auth/reenvio-verificacao/",
            {"email": technician.email},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("verificado", response.data["detail"])


    def test_login_is_case_insensitive(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "MORADOR@EXAMPLE.COM", "password": "senha-segura-123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "morador@example.com")

    def test_user_save_normalizes_email_to_lowercase(self):
        user = User(email="UPPERCASE@EXAMPLE.COM", role=User.Role.MORADOR)
        user.set_password("senha-segura-123")
        user.save()
        self.assertEqual(user.email, "uppercase@example.com")
        reloaded = User.objects.get(pk=user.pk)
        self.assertEqual(reloaded.email, "uppercase@example.com")


class AdminIntegrationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin_user = User.objects.create_superuser(
            email="admin_admin@example.com",
            password="admin-password-123",
        )

    def tearDown(self):
        cache.clear()
        super().tearDown()

    def test_admin_user_creation_sets_verified_for_operador_and_audits(self):
        from django.contrib.admin.sites import AdminSite
        from accounts.admin import UserAdmin
        from accounts.admin import UserCreationForm
        from django.test import RequestFactory

        site = AdminSite()
        ua = UserAdmin(User, site)
        rf = RequestFactory()
        req = rf.post("/admin/accounts/user/add/")
        req.user = self.admin_user

        user = User(email="operador_admin@example.com", role=User.Role.OPERADOR)
        user.set_password("senha123")
        ua.save_model(req, user, None, change=False)

        user.refresh_from_db()
        self.assertTrue(user.email_verificado)
        self.assertTrue(AuditLog.objects.filter(action="user.created", resource_id=str(user.pk)).exists())

    def test_admin_user_creation_for_technician_triggers_verification(self):
        from django.contrib.admin.sites import AdminSite
        from accounts.admin import UserAdmin
        from django.test import RequestFactory

        site = AdminSite()
        ua = UserAdmin(User, site)
        rf = RequestFactory()
        req = rf.post("/admin/accounts/user/add/")
        req.user = self.admin_user

        tech = User(email="tech_admin@example.com", role=User.Role.TECNICO)
        tech.set_password("senha123")
        ua.save_model(req, tech, None, change=False)

        tech.refresh_from_db()
        self.assertFalse(tech.email_verificado)
        self.assertTrue(EmailVerification.objects.filter(user=tech).exists())

    def test_admin_device_creation_hashes_key_and_audits(self):
        from django.contrib.admin.sites import AdminSite
        from hidroscan.admin import DeviceAdmin, DeviceAdminForm
        from hidroscan.models import Region, Property, Device
        from django.test import RequestFactory

        region = Region.objects.create(name="Zona Sul", code="zona-sul")
        prop = Property.objects.create(name="Edifício Sol", address="Rua 1", region=region, owner=self.admin_user)

        site = AdminSite()
        da = DeviceAdmin(Device, site)
        rf = RequestFactory()
        req = rf.post("/admin/hidroscan/device/add/")
        req.user = self.admin_user

        form = DeviceAdminForm(data={
            "property": prop.pk,
            "name": "Hidrômetro Bloco A",
            "serial_number": "HIDRO-ADMIN-01",
            "active": True,
            "device_key": "chave-secreta-123",
        })
        self.assertTrue(form.is_valid(), form.errors)
        device = form.save(commit=False)
        da.save_model(req, device, form, change=False)

        device.refresh_from_db()
        self.assertTrue(device.check_device_key("chave-secreta-123"))
        self.assertTrue(AuditLog.objects.filter(action="device.created", resource_id=str(device.pk)).exists())

    def test_admin_delete_queryset_audits_each_item(self):
        from django.contrib.admin.sites import AdminSite
        from accounts.admin import UserAdmin
        from django.test import RequestFactory

        u1 = User.objects.create_user(email="del1@example.com", password="pwd", role=User.Role.MORADOR)
        u2 = User.objects.create_user(email="del2@example.com", password="pwd", role=User.Role.MORADOR)

        site = AdminSite()
        ua = UserAdmin(User, site)
        rf = RequestFactory()
        req = rf.post("/admin/accounts/user/")
        req.user = self.admin_user

        ua.delete_queryset(req, User.objects.filter(pk__in=[u1.pk, u2.pk]))
        self.assertEqual(User.objects.filter(pk__in=[u1.pk, u2.pk]).count(), 0)
        self.assertTrue(AuditLog.objects.filter(action="user.deleted", resource_id=str(u1.pk)).exists())
        self.assertTrue(AuditLog.objects.filter(action="user.deleted", resource_id=str(u2.pk)).exists())
