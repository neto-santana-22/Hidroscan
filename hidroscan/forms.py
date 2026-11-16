from django import forms

from .models import Device


class DeviceAdminForm(forms.ModelForm):
    device_key = forms.CharField(
        label="Chave do dispositivo (X-Device-Key)",
        widget=forms.PasswordInput,
        required=False,
        help_text="Obrigatório na criação. Na edição, preencha apenas se desejar redefinir a chave.",
    )

    class Meta:
        model = Device
        fields = ["property", "name", "serial_number", "active", "device_key"]

    def clean(self):
        cleaned_data = super().clean()
        key = cleaned_data.get("device_key")
        if not self.instance.pk and not key:
            self.add_error("device_key", "A chave do dispositivo é obrigatória no cadastro.")
        return cleaned_data
