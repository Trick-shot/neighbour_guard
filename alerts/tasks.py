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


@shared_task(ignore_result=True)
def fan_out_witness(report_id: int):
    """Push a witness report to everyone living near the point. Slow work, so a task."""
    from places.services import residences_near

    from . import push
    from .models import WitnessReport
    from django.contrib.auth import get_user_model

    report = WitnessReport.objects.filter(pk=report_id).first()
    if not report:
        return
    ids = [r.id for r, _ in residences_near(report.lat, report.lng, WitnessReport.RADIUS_M)]
    tokens = [t for t in get_user_model().objects.filter(residence_membership__residence_id__in=ids, is_active=True)
              .values_list('push_token', flat=True) if t]
    where = f' near {report.street}' if report.street else ' near you'
    title = f'Witness report: {report.get_type_display().lower()}{where}'
    body = report.description or 'Someone passing by reported this. Check on your neighbours.'
    data = {'kind': 'witness', 'report_id': report.id, 'type': report.type}
    push.send([push.sos_message(t, title, body, data) for t in tokens])
