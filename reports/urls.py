from django.urls import path

from .views import export_report

urlpatterns = [path("relatorios/<str:report_type>/", export_report, name="report-export")]
