from django.apps import AppConfig


class HidroscanConfig(AppConfig):
    name = 'hidroscan'

    def ready(self):
        from . import signals  # noqa: F401
