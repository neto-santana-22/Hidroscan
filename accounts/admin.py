from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.db import transaction

from hidroscan.services import register_audit

from .models import EmailVerification, User
from .services import send_verification_code


class UserCreationForm(forms.ModelForm):
    password = forms.CharField(label="Senha", widget=forms.PasswordInput)
    password_confirm = forms.CharField(label="Confirmação de senha", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "todas_regioes")

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get("password")
        p2 = cleaned_data.get("password_confirm")
        if p1 and p2 and p1 != p2:
            self.add_error("password_confirm", "As senhas informadas não conferem.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        label="Senha",
        help_text=(
            "As senhas não são armazenadas em texto simples. "
            'Para alterá-la, utilize <a href="{}">este formulário</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "role",
            "todas_regioes",
            "email_verificado",
            "is_active",
            "is_staff",
            "is_superuser",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        password = self.fields.get("password")
        if password and self.instance and self.instance.pk:
            password.help_text = password.help_text.format("../password/")

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
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
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password",
                    "password_confirm",
                    "role",
                    "todas_regioes",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        is_new = not change
        if is_new:
            if obj.role == User.Role.TECNICO:
                obj.email_verificado = False
            else:
                obj.email_verificado = True
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            if is_new and obj.role == User.Role.TECNICO:
                send_verification_code(obj)
            action = "user.updated" if change else "user.created"
            register_audit(actor=request.user, action=action, resource=obj)

    def delete_model(self, request, obj):
        with transaction.atomic():
            register_audit(actor=request.user, action="user.deleted", resource=obj)
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            for obj in queryset:
                register_audit(actor=request.user, action="user.deleted", resource=obj)
            super().delete_queryset(request, queryset)


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
