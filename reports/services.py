import csv
import io
from collections.abc import Iterable

from django.db.models import Sum

from alerts.models import Alert
from monitoring.models import Reading
from occurrences.models import Occurrence


class UnsupportedReportError(ValueError):
    pass


def _visible_properties(*, user, filters):
    from hidroscan.access import imoveis_visiveis

    properties = imoveis_visiveis(user)
    if property_id := filters.get("imovel"):
        properties = properties.filter(pk=property_id)
    if region_id := filters.get("regiao"):
        properties = properties.filter(region_id=region_id)
    return properties


def build_report(*, report_type, user, filters):
    properties = _visible_properties(user=user, filters=filters)
    if report_type == "consumo":
        readings = Reading.objects.filter(device__property__in=properties)
        if start := filters.get("inicio"):
            readings = readings.filter(measured_at__gte=start)
        if end := filters.get("fim"):
            readings = readings.filter(measured_at__lte=end)
        grouped = readings.values("device__property__name").annotate(consumo=Sum("consumption")).order_by("device__property__name")
        return ("Consumo", ["Imóvel", "Consumo (m³)"], ((row["device__property__name"], row["consumo"] or 0) for row in grouped))

    if report_type == "leituras":
        readings = Reading.objects.filter(device__property__in=properties).select_related("device", "device__property")
        if start := filters.get("inicio"):
            readings = readings.filter(measured_at__gte=start)
        if end := filters.get("fim"):
            readings = readings.filter(measured_at__lte=end)
        return (
            "Leituras",
            ["Imóvel", "Dispositivo", "Instante", "Volume (m³)", "Consumo (m³)"],
            ((r.device.property.name, r.device.name, r.measured_at.isoformat(), r.volume, r.consumption) for r in readings),
        )

    if report_type == "alertas":
        alerts = Alert.objects.filter(property__in=properties).select_related("property", "device")
        if status := filters.get("status"):
            alerts = alerts.filter(status=status)
        if start := filters.get("inicio"):
            alerts = alerts.filter(last_detected_at__gte=start)
        if end := filters.get("fim"):
            alerts = alerts.filter(last_detected_at__lte=end)
        return (
            "Alertas",
            ["Imóvel", "Dispositivo", "Regra", "Gravidade", "Status", "Última detecção"],
            ((a.property.name, a.device.name, a.rule_code, a.severity, a.status, a.last_detected_at.isoformat()) for a in alerts),
        )

    if report_type == "ocorrencias":
        occurrences = Occurrence.objects.filter(property__in=properties).select_related("property", "alert")
        if status := filters.get("status"):
            occurrences = occurrences.filter(status=status)
        if start := filters.get("inicio"):
            occurrences = occurrences.filter(created_at__gte=start)
        if end := filters.get("fim"):
            occurrences = occurrences.filter(created_at__lte=end)
        return (
            "Ocorrências",
            ["Imóvel", "Título", "Status", "Criada em", "Alerta"],
            ((o.property.name, o.title, o.status, o.created_at.isoformat(), o.alert_id or "") for o in occurrences),
        )
    raise UnsupportedReportError("Tipo de relatório não suportado.")


def csv_rows(headers: list[str], rows: Iterable[tuple]):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate(0)
    for row in rows:
        writer.writerow(row)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
