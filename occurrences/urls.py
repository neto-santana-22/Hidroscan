from rest_framework.routers import DefaultRouter

from .views import OccurrenceViewSet

router = DefaultRouter()
router.register("ocorrencias", OccurrenceViewSet, basename="occurrence")
urlpatterns = router.urls
