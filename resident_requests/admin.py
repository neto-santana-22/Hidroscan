from django.contrib import admin
from django.db import transaction

from hidroscan.services import register_audit

from .models import ResidentRequest


@admin.register(ResidentRequest)
class ResidentRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "property", "requester", "category", "status", "created_at", "updated_at"]
    list_filter = ["status", "category"]
    search_fields = ["description", "resolution", "property__name"]
    raw_id_fields = ["property", "requester"]

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            action = "resident_request.updated" if change else "resident_request.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="resident_request.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="resident_request.deleted", resource=obj)
            super().delete_queryset(request, queryset)
