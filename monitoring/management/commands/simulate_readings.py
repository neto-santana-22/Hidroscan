from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from hidroscan.models import Device

from monitoring.services import ReadingValidationError, registrar_leitura


class Command(BaseCommand):
    help = "Gera leituras históricas crescentes para um dispositivo existente."

    def add_arguments(self, parser):
        parser.add_argument("serial_number")
        parser.add_argument("--count", type=int, default=24)
        parser.add_argument("--start-volume", type=Decimal, required=True)
        parser.add_argument("--increment", type=Decimal, default=Decimal("0.100"))
        parser.add_argument("--interval-minutes", type=int, default=60)

    def handle(self, *args, **options):
        if options["count"] < 1 or options["interval_minutes"] < 1 or options["increment"] < 0:
            raise CommandError("count e interval-minutes devem ser positivos; increment não pode ser negativo.")
        device = Device.objects.filter(serial_number=options["serial_number"], active=True).first()
        if not device:
            raise CommandError("Dispositivo ativo não encontrado.")

        start = timezone.now() - timedelta(minutes=options["interval_minutes"] * (options["count"] - 1))
        created = 0
        for index in range(options["count"]):
            try:
                _, was_created = registrar_leitura(
                    device=device,
                    external_id=uuid4(),
                    measured_at=start + timedelta(minutes=options["interval_minutes"] * index),
                    volume=options["start_volume"] + options["increment"] * index,
                )
                created += was_created
            except ReadingValidationError as error:
                raise CommandError(str(error)) from error
        self.stdout.write(self.style.SUCCESS(f"{created} leituras criadas para {device.serial_number}."))
