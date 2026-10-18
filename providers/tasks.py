"""Slow work for providers: payment pushes, guard notifications, the nightly lapse."""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def request_member_payment(member_id: int):
    """Ask one member's phone to approve their share. Never raises into the worker's face."""
    from . import services
    from .models import SubscriptionMember

    member = SubscriptionMember.objects.select_related('subscription__plan', 'user').filter(
        pk=member_id, status=SubscriptionMember.Status.INVITED).first()
    if not member:
        return
    try:
        services.start_payment(member)
    except services.PoolError as e:
        # Put them back in the pool: being unable to pay is not the same as leaving.
        SubscriptionMember.objects.filter(pk=member_id, status=SubscriptionMember.Status.INVITED).update(
            status=SubscriptionMember.Status.JOINED)
        logger.warning('Could not ask member %s to pay: %s', member_id, e.code)


@shared_task(ignore_result=True)
def notify_guards(alert_id: int, dispatch_ids: list[int]):
    """Tell the provider an alert needs a guard, and tell the sender a guard was asked."""
    from alerts.models import Alert
    from core.sms import send_sms

    from .models import Dispatch

    alert = Alert.objects.select_related('residence', 'sender').filter(pk=alert_id).first()
    if not alert:
        return
    dispatches = Dispatch.objects.select_related('provider').filter(pk__in=dispatch_ids)
    numbers = [d.provider.phone for d in dispatches if d.provider.phone]
    if numbers:
        where = f'{alert.residence.house_number} {alert.residence.street}'.strip()
        send_sms(f'NeighbourGuard: {alert.get_type_display().lower()} at {where}. '
                 f'A resident on your covered street needs a guard.', numbers)

    # The sender's screen learns about it the same way it learns about responders.
    from alerts.services import alert_summary
    from chat.services import broadcast_alert_update
    broadcast_alert_update(alert, alert_summary(alert))


@shared_task(ignore_result=True)
def lapse_unpaid_subscriptions():
    from . import services
    return services.lapse_unpaid()
