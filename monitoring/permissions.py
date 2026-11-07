from rest_framework.permissions import BasePermission


class HasAuthenticatedDevice(BasePermission):
    def has_permission(self, request, view):
        return bool(getattr(request.user, "is_authenticated", False) and hasattr(request.user, "device"))
