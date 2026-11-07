from rest_framework.routers import DefaultRouter

from .views import ResidentRequestViewSet

router = DefaultRouter()
router.register("solicitacoes", ResidentRequestViewSet, basename="resident-request")
urlpatterns = router.urls
