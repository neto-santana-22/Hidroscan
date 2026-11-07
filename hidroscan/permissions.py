from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdministrator(BasePermission):
    message = "Esta ação exige perfil de administrador."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.ADMINISTRADOR)


class IsOperationsUser(BasePermission):
    message = "Esta ação exige perfil de técnico, operador ou administrador."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {User.Role.TECNICO, User.Role.OPERADOR, User.Role.ADMINISTRADOR}
        )
