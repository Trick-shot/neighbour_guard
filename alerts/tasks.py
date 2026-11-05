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
    # The same words as the preview on "Emergency contacts" (Figma 1634:2469).
    at = timezone.localtime(alert.sent_at or timezone.now()).strftime('%H:%M')
    kind = alert.get_type_display().lower()
    article = 'an' if kind[:1] in 'aeiou' else 'a'
    body = (f'NeighbourGuard: {alert.sender.full_name} sent {article} {kind} alert at {at} near House '
            f'{alert.residence.house_number}, {alert.residence.street}. Neighbours are responding.')
    send_sms(body, numbers)


@shared_task(ignore_result=True)
def sms_sender(alert_id: int, what: str, responder_id: int | None = None):
    """Reply by SMS to someone who raised an SOS by SMS ("System — offline SMS", Figma 1635:2945)."""
    from django.contrib.auth import get_user_model
    from core.sms import send_sms
    from main.models import Profile

    alert = Alert.objects.select_related('sender').filter(pk=alert_id).first()
    profile = Profile.objects.filter(user=alert.sender, is_phone_verified=True).first() if alert else None
    if not profile or not profile.phone_number:
        return
    if what == 'received':
        body = 'NeighbourGuard: your SOS was received. Your neighbours are being alerted now.'
    else:
        responder = get_user_model().objects.filter(pk=responder_id).first()
        name = (responder.full_name.split(' ')[0] if responder and responder.full_name else 'A neighbour')
        body = f'NeighbourGuard: {name} is on the way.'
    send_sms(body, [profile.phone_number])


@shared_task(ignore_result=True)
def notify_contacts_resolved(alert_id: int):
    """The all-clear for the same contacts, if the sender wants it. Never sent for a duress PIN,
    because a duress "resolve" leaves the alert live (see services.resolve)."""
    from core.sms import send_sms

    alert = (Alert.objects.select_related('sender')
             .filter(pk=alert_id, status=Alert.Status.RESOLVED, under_duress=False).first())
    if not alert or not alert.sender.text_contacts_on_resolve:
        return
    numbers = list(alert.sender.emergency_contacts.values_list('phone', flat=True))
    if numbers:
        send_sms(f'{alert.sender.full_name} is safe. Their NeighbourGuard alert has been resolved.', numbers)


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
