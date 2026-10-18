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


@shared_task(ignore_result=True)
def notify_emergency_contacts(alert_id: int):
    """Text the sender's own emergency contacts once the alert is out.

    Slow work, so it is a task. The numbers and the message body are never logged.
    """
    from core.sms import send_sms

    alert = (Alert.objects.select_related('sender', 'residence')
             .filter(pk=alert_id, status=Alert.Status.SENT).first())
    if not alert:
        return
    numbers = list(alert.sender.emergency_contacts.values_list('phone', flat=True))
    if not numbers:
        return
    where = f'{alert.residence.house_number} {alert.residence.street}'.strip()
    body = (f'{alert.sender.full_name} sent a {alert.get_type_display().lower()} alert on '
            f'NeighbourGuard from {where}. Neighbours nearby have been alerted.')
    send_sms(body, numbers)
