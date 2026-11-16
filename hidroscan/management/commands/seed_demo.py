from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from hidroscan.models import Device, Property, Region, RegionAccess
from monitoring.models import Reading
from monitoring.services import registrar_leitura


class Command(BaseCommand):
    help = "Inicializa a base local com dados de demonstração (usuários, região, imóvel, dispositivo e leituras)."

    def handle(self, *args, **options):
        with transaction.atomic():
            # 1. Usuários
            admin, _ = User.objects.get_or_create(
                email="admin@hidroscan.local",
                defaults={
                    "first_name": "Administrador",
                    "last_name": "Sistema",
                    "role": User.Role.ADMINISTRADOR,
                    "email_verificado": True,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            admin.set_password("admin123456")
            admin.save()

            operador, _ = User.objects.get_or_create(
                email="operador@hidroscan.local",
                defaults={
                    "first_name": "Operador",
                    "last_name": "Central",
                    "role": User.Role.OPERADOR,
                    "email_verificado": True,
                },
            )
            operador.set_password("operador123")
            operador.save()

            tecnico, _ = User.objects.get_or_create(
                email="tecnico@hidroscan.local",
                defaults={
                    "first_name": "Técnico",
                    "last_name": "Campo",
                    "role": User.Role.TECNICO,
                    "email_verificado": True,
                },
            )
            tecnico.set_password("tecnico123")
            tecnico.save()

            morador, _ = User.objects.get_or_create(
                email="morador@hidroscan.local",
                defaults={
                    "first_name": "Morador",
                    "last_name": "Exemplo",
                    "role": User.Role.MORADOR,
                    "email_verificado": True,
                },
            )
            morador.set_password("morador123")
            morador.save()

            # 2. Região
            region, _ = Region.objects.get_or_create(
                code="central",
                defaults={
                    "name": "Região Central",
                    "active": True,
                },
            )

            # 3. Acessos regionais
            RegionAccess.objects.get_or_create(user=operador, region=region)
            RegionAccess.objects.get_or_create(user=tecnico, region=region)

            # 4. Imóvel
            prop, _ = Property.objects.get_or_create(
                name="Condomínio das Águas",
                defaults={
                    "address": "Av. Boa Viagem, 1000",
                    "region": region,
                    "owner": morador,
                    "active": True,
                },
            )

            # 5. Dispositivo
            device, created_device = Device.objects.get_or_create(
                serial_number="HIDRO-001",
                defaults={
                    "name": "Hidrômetro Principal",
                    "property": prop,
                    "active": True,
                },
            )
            device.set_device_key("chave-demo-123")
            device.save(update_fields=["device_key_hash"])

            # 6. Leituras de demonstração
            if not Reading.objects.filter(device=device).exists():
                count = 12
                interval_minutes = 60
                start = timezone.now() - timedelta(minutes=interval_minutes * (count - 1))
                start_volume = Decimal("100.000")
                increment = Decimal("0.150")

                for i in range(count):
                    registrar_leitura(
                        device=device,
                        external_id=uuid4(),
                        measured_at=start + timedelta(minutes=interval_minutes * i),
                        volume=start_volume + increment * i,
                    )
                self.stdout.write(self.style.SUCCESS("Leituras de demonstração geradas com sucesso."))

        self.stdout.write(self.style.SUCCESS("Base de demonstração inicializada com sucesso (seed_demo)."))
