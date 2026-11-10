from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from hidroscan.services import register_audit

from .models import EmailVerification, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "role", "email_verificado", "is_active"]
    list_filter = ["role", "email_verificado", "is_active", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informações pessoais", {"fields": ("first_name", "last_name")}),
        ("Perfil Hidroscan", {"fields": ("role", "todas_regioes", "email_verificado")}),
        (
            "Permissões Django",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Datas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role", "todas_regioes"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = "user.updated" if change else "user.created"
        register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        register_audit(actor=request.user, action="user.deleted", resource=obj)
        super().delete_model(request, obj)


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "expires_at", "attempts", "used_at"]
    readonly_fields = ["user", "code_hash", "expires_at", "attempts", "used_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
