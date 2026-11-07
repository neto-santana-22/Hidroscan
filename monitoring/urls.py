from django.urls import path

from .views import dashboard, ingest_reading, property_consumption, property_readings

urlpatterns = [
    path("leituras/", ingest_reading, name="reading-ingestion"),
    path("dashboard/", dashboard, name="dashboard"),
    path("imoveis/<int:property_id>/leituras/", property_readings, name="property-readings"),
    path("imoveis/<int:property_id>/consumo/", property_consumption, name="property-consumption"),
]
