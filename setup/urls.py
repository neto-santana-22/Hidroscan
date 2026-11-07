from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/', include('accounts.urls')),
    path('api/', include('hidroscan.api_urls')),
    path('api/', include('monitoring.urls')),
    path('api/', include('alerts.urls')),
    path('api/', include('occurrences.urls')),
    path('api/', include('workorders.urls')),
    path('api/', include('resident_requests.urls')),
    path('', include('hidroscan.urls')),
]
