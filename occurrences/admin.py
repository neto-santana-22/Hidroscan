from django.contrib import admin
from django.db import transaction

from hidroscan.services import register_audit

from .models import Occurrence, OccurrenceUpdate


class OccurrenceUpdateInline(admin.TabularInline):
    model = OccurrenceUpdate
    extra = 0
    readonly_fields = ["author", "message", "status", "created_at"]


@admin.register(Occurrence)
class OccurrenceAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "property", "alert", "status", "created_by", "created_at", "updated_at"]
    list_filter = ["status", "property__region"]
    search_fields = ["title", "description", "property__name"]
    raw_id_fields = ["property", "alert", "created_by"]
    inlines = [OccurrenceUpdateInline]

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            action = "occurrence.updated" if change else "occurrence.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="occurrence.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="occurrence.deleted", resource=obj)
            super().delete_queryset(request, queryset)


@admin.register(OccurrenceUpdate)
class OccurrenceUpdateAdmin(admin.ModelAdmin):
    list_display = ["id", "occurrence", "author", "status", "created_at"]
    list_filter = ["status"]
    raw_id_fields = ["occurrence", "author"]
