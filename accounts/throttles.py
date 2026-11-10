from rest_framework.throttling import SimpleRateThrottle


class VerificationRateThrottle(SimpleRateThrottle):
    """Limita requisições por IP no endpoint de verificação de e-mail."""

    rate = "10/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": "verification",
            "ident": self.get_ident(request),
        }
