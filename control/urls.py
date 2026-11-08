from django.urls import path

from .views import valve

urlpatterns = [
    path("dispositivos/<int:device_id>/valvula/", valve, name="valve"),
]
