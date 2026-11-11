from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "name", "role", "todas_regioes", "email_verificado"]
        read_only_fields = ["id", "email_verificado"]

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        qs = User.objects.filter(email__iexact=normalized)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return normalized

    def get_name(self, user) -> str:
        return user.get_full_name() or user.email


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=User.Role.choices, required=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "role", "todas_regioes"]
        read_only_fields = ["id"]

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return normalized


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r"^\d{6}$")


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
