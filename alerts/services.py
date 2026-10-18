"""SOS rules. Every state change is a conditional UPDATE, so two devices can never both win a race."""
import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from places.services import residence_of, users_near

from . import push
from .models import Alert, AlertResponse, SafetyPin

logger = logging.getLogger(__name__)


class AlertError(Exception):
    """A rule was broken. `code` maps to an HTTP status in the views."""

    def __init__(self, message, code='invalid'):
        super().__init__(message)
        self.code = code


def create_alert(user, *, client_id, type, message='', channel=Alert.Channel.APP,
                 sms_ref='') -> tuple[Alert, bool]:
    """Start the countdown. A retry with the same client_id returns the same alert (created=False)."""
    # An SMS carries an 8-character ref, not a UUID, so the server makes the id in that case.
    if client_id is None:
        client_id = uuid.uuid4()
    existing = Alert.objects.filter(client_id=client_id).first()
    if not existing:
        # The same SOS may have already arrived by SMS, carrying only its short ref. Adopt that
        # alert rather than raising a second one for the same emergency. A ref that belongs to
        # someone else is ignored, not refused: it is their alert, and this caller still needs one.
        candidate = Alert.objects.filter(sms_ref=Alert.ref_for(client_id)).exclude(sms_ref='').first()
        if candidate and candidate.sender_id == user.id:
            Alert.objects.filter(pk=candidate.pk).update(client_id=client_id)
            candidate.refresh_from_db()
            existing = candidate
    if existing:
        if existing.sender_id != user.id:
            raise AlertError('This id belongs to another alert.', 'conflict')
        return existing, False

    residence = residence_of(user)
    if residence is None:
        raise AlertError('Add your home before sending an SOS.', 'no_home')

    now = timezone.now()
    sms = channel == Alert.Channel.SMS
    try:
        with transaction.atomic():
            alert = Alert.objects.create(
                client_id=client_id, sender=user, residence=residence, neighbourhood=residence.neighbourhood,
                type=type, message=message, channel=channel, sms_ref=sms_ref,
                radius_m=settings.SOS_RADIUS_M,
                # SMS skips the countdown: the person already chose to send by tapping Send.
                send_at=now if sms else now + timedelta(seconds=settings.SOS_COUNTDOWN_SECONDS),
            )
    except IntegrityError:  # the same client_id raced in from two retries
        return Alert.objects.get(client_id=client_id), False

    if sms:
        transaction.on_commit(lambda: claim_and_send(alert.id))
    else:
        from .tasks import send_alert
        transaction.on_commit(lambda: send_alert.apply_async(args=[alert.id], eta=alert.send_at))
    return alert, True


def _require_sender(alert, user):
    if alert.sender_id != user.id:
        raise AlertError('Only the person who sent this alert can do that.', 'forbidden')


def cancel_alert(alert: Alert, user) -> Alert:
    _require_sender(alert, user)
    changed = Alert.objects.filter(pk=alert.pk, status=Alert.Status.PENDING).update(
        status=Alert.Status.CANCELLED, cancelled_at=timezone.now()
    )
    alert.refresh_from_db()
    if not changed:
        raise AlertError('Too late to cancel: the alert was already sent.', 'conflict')
    return alert


def change_type(alert: Alert, user, new_type: str) -> Alert:
    """During the countdown the sender can still change what is happening."""
    _require_sender(alert, user)
    changed = Alert.objects.filter(pk=alert.pk, status=Alert.Status.PENDING).update(type=new_type)
    alert.refresh_from_db()
    if not changed:
        raise AlertError('The alert was already sent.', 'conflict')
    return alert


def recipients_count(alert: Alert) -> int:
    """How many neighbours this alert reaches at its current radius (shown during the countdown)."""
    return users_near(alert.residence, alert.radius_m).count()


def send_now(alert: Alert, user) -> Alert:
    _require_sender(alert, user)
    claim_and_send(alert.pk)
    alert.refresh_from_db()
    if alert.status == Alert.Status.CANCELLED:
        raise AlertError('This alert was cancelled.', 'conflict')
    return alert


def claim_and_send(alert_id: int) -> bool:
    """pending → sent. Only the caller that wins the update fans out; everyone else does nothing."""
    changed = Alert.objects.filter(pk=alert_id, status=Alert.Status.PENDING).update(
        status=Alert.Status.SENT, sent_at=timezone.now()
    )
    if not changed:
        return False
    alert = Alert.objects.select_related('sender', 'residence', 'neighbourhood').get(pk=alert_id)
    fan_out(alert, alert.radius_m)
    from .tasks import widen_if_no_response
    widen_if_no_response.apply_async(args=[alert.id], countdown=settings.SOS_WIDEN_AFTER_SECONDS)
    return True


def fan_out(alert: Alert, radius_m: int, exclude_user_ids=()):
    """Push to neighbours in the radius and post the live card in the neighbourhood group."""
    recipients = users_near(alert.residence, radius_m).exclude(id__in=exclude_user_ids)
    tokens = [t for t in recipients.values_list('push_token', flat=True) if t]
    title = push.TITLES.get(alert.type, push.TITLES['other'])
    body = f'{alert.sender.full_name} at {alert.residence.street} needs help'
    data = {'kind': 'sos', 'alert_id': alert.id, 'type': alert.type}
    accepted = push.send([push.sos_message(t, title, body, data) for t in tokens])
    Alert.objects.filter(pk=alert.pk).update(notified_count=alert.notified_count + accepted)

    from chat.services import post_alert_card
    post_alert_card(alert)

    # Family first hears about this now, not during the countdown: a cancelled alert must never
    # frighten anyone. Only on the first fan-out, so widening does not text them twice.
    if not exclude_user_ids:
        from .tasks import notify_emergency_contacts
        notify_emergency_contacts.delay(alert.pk)
    logger.info('Alert %s sent to %d devices within %d m', alert.pk, accepted, radius_m)


def widen_if_no_response(alert_id: int) -> bool:
    """Nobody is coming after the first window: notify the next ring of homes once."""
    alert = Alert.objects.select_related('sender', 'residence').filter(pk=alert_id, status=Alert.Status.SENT).first()
    if not alert or alert.radius_m >= settings.SOS_WIDEN_RADIUS_M:
        return False
    if alert.responses.filter(state__in=[AlertResponse.State.COMING, AlertResponse.State.ARRIVED]).exists():
        return False
    already = list(users_near(alert.residence, alert.radius_m).values_list('id', flat=True))
    changed = Alert.objects.filter(pk=alert.pk, radius_m=alert.radius_m).update(radius_m=settings.SOS_WIDEN_RADIUS_M)
    if not changed:
        return False
    fan_out(alert, settings.SOS_WIDEN_RADIUS_M, exclude_user_ids=already)
    return True


def can_respond(user, alert: Alert) -> bool:
    """Neighbours inside the alert's current radius (or in its neighbourhood) may respond."""
    if user.id == alert.sender_id:
        return False
    mine = residence_of(user)
    if not mine:
        return False
    if mine.neighbourhood_id == alert.neighbourhood_id:
        return True
    return users_near(alert.residence, alert.radius_m).filter(id=user.id).exists()


def respond(alert: Alert, user, state: str, eta_min=None) -> AlertResponse:
    if not alert.is_live:
        raise AlertError('This alert is no longer live.', 'conflict')
    if not can_respond(user, alert):
        raise AlertError('You are not a neighbour of this alert.', 'forbidden')
    response, _ = AlertResponse.objects.update_or_create(
        alert=alert, responder=user, defaults={'state': state, 'eta_min': eta_min}
    )
    from chat.services import broadcast_alert_update
    broadcast_alert_update(alert, alert_summary(alert))
    return response


def resolve(alert: Alert, user, pin: str | None) -> Alert:
    """'I'm safe'. With the duress PIN the phone sees the same result, but the alert stays live."""
    _require_sender(alert, user)
    if alert.status != Alert.Status.SENT:
        raise AlertError('Only a live alert can be resolved.', 'conflict')

    safety = SafetyPin.objects.filter(user=user).first()
    result = 'ok'
    if safety:
        result = safety.match(pin or "")
        if result is None:
            raise AlertError('Wrong PIN.', 'invalid')

    if result == 'duress':
        Alert.objects.filter(pk=alert.pk).update(under_duress=True)
        alert.refresh_from_db()
        from chat.services import broadcast_alert_update
        broadcast_alert_update(alert, alert_summary(alert))
        logger.warning('Alert %s confirmed with the duress PIN', alert.pk)
        return alert  # the view answers exactly as for a real resolve

    Alert.objects.filter(pk=alert.pk, status=Alert.Status.SENT).update(
        status=Alert.Status.RESOLVED, resolved_at=timezone.now()
    )
    alert.refresh_from_db()
    from chat.services import broadcast_alert_update
    broadcast_alert_update(alert, alert_summary(alert))
    return alert


def alert_summary(alert: Alert) -> dict:
    """Small live state for alert cards in chat (no coordinates)."""
    return {
        'alert_id': alert.id,
        'status': alert.status,
        'type': alert.type,
        'under_duress': alert.under_duress,
        'responders': [
            {'user_id': r.responder_id, 'name': r.responder.full_name, 'state': r.state, 'eta_min': r.eta_min}
            for r in alert.responses.select_related('responder')
        ],
    }


def active_alerts_for(user):
    """Live alerts the user may see: their neighbourhood's, plus any they responded to."""
    mine = residence_of(user)
    qs = Alert.objects.filter(status=Alert.Status.SENT)
    if not mine:
        return qs.filter(responses__responder=user).distinct()
    from django.db.models import Q
    return qs.filter(Q(neighbourhood=mine.neighbourhood) | Q(responses__responder=user)).distinct()
