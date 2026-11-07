from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import UserViewSet, csrf, email_verification, login_view, logout_view, me

router = DefaultRouter()
router.register("usuarios", UserViewSet, basename="user")

urlpatterns = [
    path("auth/csrf/", csrf, name="csrf"),
    path("auth/login/", login_view, name="login"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", me, name="me"),
    path("auth/verificacao-email/", email_verification, name="email-verification"),
]
urlpatterns += router.urls
