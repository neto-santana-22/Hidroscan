import secrets
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import EmailVerification, User


class AccountValidationError(ValueError):
    pass


def create_user(*, email, password, role, **extra_fields):
    with transaction.atomic():
        user = User.objects.create_user(email=email, password=password, role=role, **extra_fields)
        if user.role == User.Role.TECNICO:
            send_verification_code(user)
        else:
            user.email_verificado = True
            user.save(update_fields=["email_verificado"])
    return user


def send_verification_code(user):
    code = f"{secrets.randbelow(1_000_000):06d}"
    EmailVerification.objects.update_or_create(
        user=user,
        defaults={
            "code_hash": make_password(code),
            "expires_at": timezone.now() + timedelta(minutes=5),
            "attempts": 0,
            "used_at": None,
        },
    )
    send_mail(
        subject="Código de verificação Hidroscan",
        message=f"Seu código de verificação é: {code}",
        from_email=None,
        recipient_list=[user.email],
    )


def verify_email(*, user, code):
    invalid_code = False
    with transaction.atomic():
        try:
            verification = EmailVerification.objects.select_for_update().get(user=user)
        except EmailVerification.DoesNotExist as error:
            raise AccountValidationError("Nenhum código de verificação foi solicitado.") from error
        if verification.used_at:
            raise AccountValidationError("Este código já foi utilizado.")
        if verification.attempts >= 5:
            raise AccountValidationError("Limite de tentativas excedido.")
        if verification.expires_at <= timezone.now():
            raise AccountValidationError("Código de verificação expirado.")

        verification.attempts += 1
        if not check_password(code, verification.code_hash):
            verification.save(update_fields=["attempts"])
            invalid_code = True
        else:
            verification.used_at = timezone.now()
            verification.save(update_fields=["attempts", "used_at"])
            user.email_verificado = True
            user.save(update_fields=["email_verificado"])
    if invalid_code:
        raise AccountValidationError("Código de verificação inválido.")


def authenticate_user(*, request, email, password):
    user = authenticate(request, email=email, password=password)
    if user is None:
        raise AccountValidationError("E-mail ou senha inválidos.")
    if user.role == User.Role.TECNICO and not user.email_verificado:
        raise AccountValidationError("O e-mail do técnico ainda não foi verificado.")
    return user
