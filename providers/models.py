"""Security providers, pooled street plans, payments and guard dispatch.

The money rules are the ones that matter here (docs/reference/backend.md, "Security providers and
payments"):

- houses join a pool for free; nobody is charged until the pool reaches the provider's minimum;
- only a **verified callback from the payment provider** marks a member paid — the app never decides
  that, and neither does anything the phone sends;
- every callback is stored raw and is unique on its receipt number, so a replay changes nothing;
- activation happens exactly once even if two payments land in the same second.
"""
from django.conf import settings
from django.db import models


class Provider(models.Model):
    name = models.CharField(max_length=120)
    licence_no = models.CharField(max_length=60, blank=True)
    # Set by staff after checking the licence. An unverified provider is not shown to residents.
    verified = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    coverage = models.ManyToManyField('places.Neighbourhood', related_name='providers', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Plan(models.Model):
    class Kind(models.TextChoices):
        STREET = 'street', 'Street (pooled)'
        HOUSE = 'house', 'Single house'

    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='plans')
    kind = models.CharField(max_length=6, choices=Kind.choices, default=Kind.STREET)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price_tsh = models.PositiveIntegerField(help_text='Per house, per month, in TSh')
    # The provider decides how many houses make a patrol worth running.
    min_houses = models.PositiveSmallIntegerField(default=1)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['price_tsh']

    def __str__(self):
        return f'{self.provider.name}: {self.name}'


class Subscription(models.Model):
    """One pool. For a street plan it gathers houses on one street of one neighbourhood."""

    class Status(models.TextChoices):
        GATHERING = 'gathering', 'Gathering houses'
        ACTIVE = 'active', 'Active'
        LAPSED = 'lapsed', 'Lapsed'
        CANCELLED = 'cancelled', 'Cancelled'

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='subscriptions')
    neighbourhood = models.ForeignKey('places.Neighbourhood', on_delete=models.CASCADE,
                                      related_name='subscriptions')
    street = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.GATHERING, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # One pool per plan per street, so two neighbours cannot start rival pools.
            models.UniqueConstraint(fields=['plan', 'neighbourhood', 'street'], name='one_pool_per_street'),
        ]

    def __str__(self):
        return f'{self.plan} on {self.street or self.neighbourhood}'

    @property
    def paid_count(self) -> int:
        return self.members.filter(status=SubscriptionMember.Status.PAID).count()

    @property
    def joined_count(self) -> int:
        return self.members.exclude(status=SubscriptionMember.Status.LEFT).count()


class SubscriptionMember(models.Model):
    class Status(models.TextChoices):
        JOINED = 'joined', 'Joined the pool'
        INVITED = 'invited', 'Asked to pay'
        PAID = 'paid', 'Paid'
        LEFT = 'left', 'Left'

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='members')
    residence = models.ForeignKey('places.Residence', on_delete=models.CASCADE, related_name='plan_memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='plan_memberships')
    status = models.CharField(max_length=7, choices=Status.choices, default=Status.JOINED, db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    paid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['subscription', 'residence'], name='one_membership_per_home'),
        ]

    def __str__(self):
        return f'{self.residence} in {self.subscription_id} ({self.status})'


class Payment(models.Model):
    """One attempt to collect one member's share. Created before the push, resolved by the callback."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Waiting for the customer'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed or cancelled'

    member = models.ForeignKey(SubscriptionMember, on_delete=models.CASCADE, related_name='payments')
    amount_tsh = models.PositiveIntegerField()
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=7, choices=Status.choices, default=Status.PENDING, db_index=True)
    # What we sent the gateway, so a callback can be matched to it.
    checkout_id = models.CharField(max_length=80, blank=True, db_index=True)
    # The receipt number from the gateway. Unique, so replaying a callback cannot pay twice.
    mpesa_ref = models.CharField(max_length=40, blank=True, null=True, unique=True)
    # Every callback kept whole, for the day somebody disputes a payment.
    raw_callback = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.amount_tsh} TSh for member {self.member_id} ({self.status})'


class Dispatch(models.Model):
    """A provider's guard sent to a live alert on a street they cover."""

    class Status(models.TextChoices):
        REQUESTED = 'requested', 'Requested'
        ACCEPTED = 'accepted', 'Guard on the way'
        ARRIVED = 'arrived', 'Guard arrived'
        DECLINED = 'declined', 'Declined'

    alert = models.ForeignKey('alerts.Alert', on_delete=models.CASCADE, related_name='dispatches')
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='dispatches')
    guard_name = models.CharField(max_length=120, blank=True)
    guard_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=9, choices=Status.choices, default=Status.REQUESTED)
    eta_min = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['alert', 'provider'], name='one_dispatch_per_provider_per_alert'),
        ]
