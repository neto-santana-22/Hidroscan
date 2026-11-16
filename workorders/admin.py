from django.contrib import admin
from django.db import transaction

from hidroscan.services import register_audit

from .models import WorkOrder


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "occurrence", "assigned_to", "priority", "status", "due_at", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]
    raw_id_fields = ["occurrence", "assigned_to", "created_by"]

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            action = "work_order.updated" if change else "work_order.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="work_order.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="work_order.deleted", resource=obj)
            super().delete_queryset(request, queryset)
