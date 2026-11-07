from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Anomaly:
    rule_code: str
    title: str
    description: str
    severity: str


def detect_consumption_spike(*, consumption: Decimal, threshold: Decimal) -> Anomaly | None:
    """Regra pura: identifica um consumo incremental acima do limiar configurado."""
    if consumption < threshold:
        return None
    return Anomaly(
        rule_code="consumption_spike",
        title="Consumo acima do limite",
        description=f"O consumo incremental de {consumption} m³ excede o limite configurado de {threshold} m³.",
        severity="high",
    )
