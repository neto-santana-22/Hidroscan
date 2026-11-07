from dataclasses import dataclass

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from hidroscan.models import Device


@dataclass(frozen=True)
class DevicePrincipal:
    device: Device
    is_authenticated: bool = True


class DeviceKeyAuthentication(BaseAuthentication):
    header_name = "HTTP_X_DEVICE_KEY"

    def authenticate_header(self, request):
        return "DeviceKey"

    def authenticate(self, request):
        raw_key = request.META.get(self.header_name)
        if not raw_key:
            raise AuthenticationFailed("O cabeçalho X-Device-Key é obrigatório.")

        for device in Device.objects.filter(active=True).select_related("property"):
            if device.check_device_key(raw_key):
                return DevicePrincipal(device=device), device
        raise AuthenticationFailed("Chave de dispositivo inválida.")
