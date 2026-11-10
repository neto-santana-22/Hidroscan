from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from .services import register_audit


@receiver(user_logged_in)
def audit_login(sender, request, user, **kwargs):
    register_audit(actor=user, action="auth.login", resource=user)


@receiver(user_logged_out)
def audit_logout(sender, request, user, **kwargs):
    if user is not None:
        register_audit(actor=user, action="auth.logout", resource=user)
