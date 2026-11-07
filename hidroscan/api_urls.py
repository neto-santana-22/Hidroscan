from rest_framework.routers import DefaultRouter

from .api_views import AuditLogViewSet, DeviceViewSet, PropertyViewSet, RegionAccessViewSet, RegionViewSet

router = DefaultRouter()
router.register("regioes", RegionViewSet, basename="region")
router.register("imoveis", PropertyViewSet, basename="property")
router.register("dispositivos", DeviceViewSet, basename="device")
router.register("acessos-regiao", RegionAccessViewSet, basename="region-access")
router.register("auditoria", AuditLogViewSet, basename="audit-log")

urlpatterns = router.urls
