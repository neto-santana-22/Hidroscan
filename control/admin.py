from django.contrib import admin
from django.db import transaction

from hidroscan.services import register_audit

from .models import ValveCommand


@admin.register(ValveCommand)
class ValveCommandAdmin(admin.ModelAdmin):
    list_display = ["id", "device", "requested_by", "action", "status", "requested_at"]
    list_filter = ["action", "status", "requested_at"]
    search_fields = ["device__name", "device__serial_number", "requested_by__email", "reason"]
    raw_id_fields = ["device", "requested_by"]
    readonly_fields = ["requested_at"]

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            action = "valve_command.updated" if change else "valve_command.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="valve_command.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="valve_command.deleted", resource=obj)
            super().delete_queryset(request, queryset)
