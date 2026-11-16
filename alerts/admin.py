from django.contrib import admin
from django.db import transaction

from hidroscan.services import register_audit

from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "rule_code", "severity", "status", "property", "device", "occurrences_count", "last_detected_at"]
    list_filter = ["status", "severity", "rule_code"]
    search_fields = ["title", "description", "rule_code", "device__serial_number"]
    raw_id_fields = ["property", "device", "acknowledged_by"]

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            action = "alert.updated" if change else "alert.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="alert.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="alert.deleted", resource=obj)
            super().delete_queryset(request, queryset)
