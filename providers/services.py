"""Pool and payment rules. Every state change here is a conditional update."""
import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from places.services import residence_of

from .models import Dispatch, Payment, Plan, Provider, Subscription, SubscriptionMember

logger = logging.getLogger(__name__)

PAID_FOR_DAYS = 30


class PoolError(Exception):
    def __init__(self, message, code='invalid'):
        super().__init__(message)
        self.code = code


def providers_for(user):
    """Verified providers covering the caller's neighbourhood. Unverified ones are not offered."""
    home = residence_of(user)
    if not home:
        return Provider.objects.none()
    return (Provider.objects.filter(verified=True, coverage=home.neighbourhood)
            .prefetch_related('plans').distinct())


def join_pool(user, plan: Plan) -> SubscriptionMember:
    """Join the pool for my own street. Free: nobody is charged until the pool fills."""
    home = residence_of(user)
    if not home:
        raise PoolError('Add your home first.', 'no_home')
    if not home.is_verified:
        raise PoolError('Your home has to be verified before you can join a plan.', 'forbidden')
    if not plan.active or not plan.provider.verified:
        raise PoolError('That plan is not available.', 'forbidden')
    if not plan.provider.coverage.filter(pk=home.neighbourhood_id).exists():
        raise PoolError('That provider does not cover your area.', 'forbidden')

    street = home.street if plan.kind == Plan.Kind.STREET else f'{home.house_number} {home.street}'
    with transaction.atomic():
        subscription, _ = Subscription.objects.get_or_create(
            plan=plan, neighbourhood=home.neighbourhood, street=street,
        )
        member, created = SubscriptionMember.objects.get_or_create(
            subscription=subscription, residence=home, defaults={'user': user},
        )
        if not created and member.status == SubscriptionMember.Status.LEFT:
            SubscriptionMember.objects.filter(pk=member.pk).update(status=SubscriptionMember.Status.JOINED)
            member.refresh_from_db()

    maybe_collect(subscription)
    return member


def leave_pool(user, plan: Plan) -> None:
    home = residence_of(user)
    if not home:
        return
    SubscriptionMember.objects.filter(
        subscription__plan=plan, residence=home,
    ).exclude(status=SubscriptionMember.Status.PAID).update(status=SubscriptionMember.Status.LEFT)


def maybe_collect(subscription: Subscription) -> int:
    """The pool is full enough: ask each joined member to pay. Returns how many were asked.

    Only members still at `joined` are asked, so a second call does not double-charge anybody.
    """
    plan = subscription.plan
    if subscription.status not in (Subscription.Status.GATHERING, Subscription.Status.LAPSED):
        return 0
    if subscription.joined_count < plan.min_houses:
        return 0

    from .tasks import request_member_payment
    asked = 0
    for member in subscription.members.filter(status=SubscriptionMember.Status.JOINED):
        # Conditional: whoever flips joined → invited is the one that queues the push.
        changed = SubscriptionMember.objects.filter(
            pk=member.pk, status=SubscriptionMember.Status.JOINED,
        ).update(status=SubscriptionMember.Status.INVITED)
        if changed:
            request_member_payment.delay(member.pk)
            asked += 1
    return asked


def start_payment(member: SubscriptionMember) -> Payment:
    """Create the pending payment row, then ask the gateway. The row exists either way, so a
    failed push is visible to the user instead of silently never happening."""
    from main.models import Profile

    from . import mpesa

    profile = Profile.objects.filter(user=member.user, is_phone_verified=True).first()
    if not profile or not profile.phone_number:
        raise PoolError('A verified phone number is needed to pay.', 'no_phone')

    payment = Payment.objects.create(
        member=member, amount_tsh=member.subscription.plan.price_tsh, phone=profile.phone_number,
    )
    try:
        checkout_id = mpesa.request_payment(
            phone=profile.phone_number, amount_tsh=payment.amount_tsh,
            reference=f'NG{payment.pk}', description=member.subscription.plan.name,
        )
    except (mpesa.NotConfigured, mpesa.PushFailed) as e:
        Payment.objects.filter(pk=payment.pk).update(status=Payment.Status.FAILED)
        raise PoolError(str(e), 'gateway') from e
    Payment.objects.filter(pk=payment.pk).update(checkout_id=checkout_id)
    payment.refresh_from_db()
    return payment


@transaction.atomic
def settle_payment(raw: dict) -> Payment | None:
    """Apply a gateway callback. The only way a payment becomes `paid`.

    Idempotent twice over: the receipt number is unique in the database, and the row is only moved
    out of `pending` by a conditional update. A replayed callback therefore changes nothing.
    """
    from . import mpesa

    read = mpesa.read_callback(raw)
    checkout_id = read['checkout_id']
    if not checkout_id:
        logger.warning('Payment callback with no checkout id stored and ignored')
        return None

    payment = Payment.objects.select_for_update().filter(checkout_id=checkout_id).first()
    if not payment:
        logger.warning('Payment callback for an unknown checkout id')
        return None

    # Keep every callback whole, even a repeat: this is the record if anyone disputes it.
    Payment.objects.filter(pk=payment.pk).update(raw_callback=raw)

    if not read['success']:
        Payment.objects.filter(pk=payment.pk, status=Payment.Status.PENDING).update(
            status=Payment.Status.FAILED, settled_at=timezone.now())
        payment.refresh_from_db()
        return payment

    try:
        changed = Payment.objects.filter(pk=payment.pk, status=Payment.Status.PENDING).update(
            status=Payment.Status.PAID, mpesa_ref=read['receipt'], settled_at=timezone.now())
    except IntegrityError:
        # That receipt is already on another payment: a replay. Nothing to do.
        logger.warning('Duplicate payment receipt ignored')
        return payment
    payment.refresh_from_db()
    if not changed:
        return payment

    SubscriptionMember.objects.filter(pk=payment.member_id).update(
        status=SubscriptionMember.Status.PAID,
        paid_until=timezone.now() + timedelta(days=PAID_FOR_DAYS),
    )
    activate_if_paid(payment.member.subscription)
    return payment


def activate_if_paid(subscription: Subscription) -> bool:
    """Turn coverage on once enough members have paid. Runs at most once per activation.

    Two payments landing in the same second both call this; the conditional update means only one
    of them actually activates, so a provider is never told to start twice.
    """
    if subscription.paid_count < subscription.plan.min_houses:
        return False
    changed = Subscription.objects.filter(
        pk=subscription.pk,
    ).exclude(status=Subscription.Status.ACTIVE).update(
        status=Subscription.Status.ACTIVE, starts_at=timezone.now(),
    )
    if changed:
        logger.info('Subscription %s is now active', subscription.pk)
    return bool(changed)


def lapse_unpaid() -> int:
    """Nightly: coverage stops when too few members are still paid up."""
    lapsed = 0
    for subscription in Subscription.objects.filter(status=Subscription.Status.ACTIVE):
        still_paid = subscription.members.filter(
            status=SubscriptionMember.Status.PAID, paid_until__gt=timezone.now(),
        ).count()
        if still_paid < subscription.plan.min_houses:
            changed = Subscription.objects.filter(
                pk=subscription.pk, status=Subscription.Status.ACTIVE,
            ).update(status=Subscription.Status.LAPSED)
            lapsed += bool(changed)
    return lapsed


def active_providers_for_residence(residence):
    """Providers whose pool covers this exact street right now."""
    return Provider.objects.filter(
        plans__subscriptions__status=Subscription.Status.ACTIVE,
        plans__subscriptions__neighbourhood=residence.neighbourhood,
        plans__subscriptions__members__residence=residence,
        plans__subscriptions__members__status=SubscriptionMember.Status.PAID,
    ).distinct()


def dispatch_for_alert(alert) -> list[Dispatch]:
    """An SOS on a covered street: ask the provider's guard to go, and tell the sender.

    The dispatch is a record, not a promise: it starts at `requested` and only the provider moves
    it on. The sender sees exactly that state, never a guess.
    """
    created = []
    for provider in active_providers_for_residence(alert.residence):
        dispatch, made = Dispatch.objects.get_or_create(alert=alert, provider=provider)
        if made:
            created.append(dispatch)
    if created:
        from .tasks import notify_guards
        notify_guards.delay(alert.pk, [d.pk for d in created])
    return created
