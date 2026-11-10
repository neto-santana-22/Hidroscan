from django.contrib import admin

from .models import AuditLog, Device, Property, Region, RegionAccess
from .services import register_audit


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "active"]
    search_fields = ["name", "code"]
    list_filter = ["active"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = "region.updated" if change else "region.created"
        register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        register_audit(actor=request.user, action="region.deleted", resource=obj)
        super().delete_model(request, obj)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ["name", "address", "region", "owner", "active"]
    search_fields = ["name", "address"]
    list_filter = ["active", "region"]
    raw_id_fields = ["owner"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = "property.updated" if change else "property.created"
        register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        register_audit(actor=request.user, action="property.deleted", resource=obj)
        super().delete_model(request, obj)


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ["name", "serial_number", "property", "valve_state", "active"]
    search_fields = ["name", "serial_number"]
    list_filter = ["active", "valve_state"]
    readonly_fields = ["device_key_hash", "valve_state", "last_reading_at"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = "device.updated" if change else "device.created"
        register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        register_audit(actor=request.user, action="device.deleted", resource=obj)
        super().delete_model(request, obj)


@admin.register(RegionAccess)
class RegionAccessAdmin(admin.ModelAdmin):
    list_display = ["user", "region"]
    raw_id_fields = ["user"]
    list_filter = ["region"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = "regionaccess.updated" if change else "regionaccess.created"
        register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        register_audit(actor=request.user, action="regionaccess.deleted", resource=obj)
        super().delete_model(request, obj)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor", "action", "resource_type", "resource_id"]
    list_filter = ["action", "resource_type"]
    search_fields = ["action", "resource_id"]
    readonly_fields = ["actor", "action", "resource_type", "resource_id", "details", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
