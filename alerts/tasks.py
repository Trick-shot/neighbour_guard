from celery import shared_task
from django.utils import timezone

from . import services
from .models import Alert


@shared_task(ignore_result=True)
def send_alert(alert_id: int):
    services.claim_and_send(alert_id)


@shared_task(ignore_result=True)
def sweep_due_alerts():
    """Safety net: send pending alerts whose countdown ended but whose task never ran."""
    due = Alert.objects.filter(status=Alert.Status.PENDING, send_at__lte=timezone.now()).values_list('id', flat=True)
    for alert_id in due:
        services.claim_and_send(alert_id)


@shared_task(ignore_result=True)
def widen_if_no_response(alert_id: int):
    services.widen_if_no_response(alert_id)
