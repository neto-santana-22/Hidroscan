from django.db.models.signals import post_save
from django.dispatch import receiver

from monitoring.models import Reading

from .engine import evaluate_reading


@receiver(post_save, sender=Reading)
def evaluate_alert_rules(sender, instance, created, **kwargs):
    if created:
        evaluate_reading(instance)
