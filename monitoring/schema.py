from drf_spectacular.extensions import OpenApiAuthenticationExtension


class DeviceKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "monitoring.authentication.DeviceKeyAuthentication"
    name = "DeviceKeyAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "header", "name": "X-Device-Key"}
