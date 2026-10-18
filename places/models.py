"""Neighbourhoods and residences: who lives where, and who is a verified neighbour.

Exact coordinates live here and never leave the server except through
places.serializers.ResidenceResponderSerializer during a live alert.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class Neighbourhood(models.Model):
    """The unit of trust. Alerts, issues, groups and provider plans are scoped to it."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    centre_lat = models.FloatField()
    centre_lng = models.FloatField()
    radius_m = models.PositiveIntegerField(default=500)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Residence(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Waiting for vouches'
        VERIFIED = 'verified', 'Verified'

    neighbourhood = models.ForeignKey(Neighbourhood, on_delete=models.PROTECT, related_name='residences')
    house_number = models.CharField(max_length=20)
    street = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    directions = models.CharField(max_length=255, blank=True, help_text='How to find the house (gate colour, landmark)')
    lat = models.FloatField()
    lng = models.FloatField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # How many vouches from verified neighbours turn a pending residence verified.
    VOUCHES_NEEDED = 2

    class Meta:
        indexes = [models.Index(fields=['lat', 'lng'])]

    def __str__(self):
        return f'House {self.house_number}, {self.street}'

    @property
    def is_verified(self):
        return self.status == self.Status.VERIFIED

    def mark_verified(self):
        self.status = self.Status.VERIFIED
        self.verified_at = timezone.now()
        self.save(update_fields=['status', 'verified_at'])


class ResidenceMember(models.Model):
    """One user belongs to at most one residence (decision recorded in docs/DECISIONS.md)."""

    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        MEMBER = 'member', 'Member'

    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='members')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='residence_membership')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user} @ {self.residence}'


class HouseholdPerson(models.Model):
    """Someone who lives in the house but has no app. Shown to responders only."""

    class AgeGroup(models.TextChoices):
        CHILD = 'child', 'Child'
        ADULT = 'adult', 'Adult'
        ELDERLY = 'elderly', 'Elderly'

    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='household')
    name = models.CharField(max_length=100)
    age_group = models.CharField(max_length=10, choices=AgeGroup.choices, default=AgeGroup.ADULT)
    needs_help = models.BooleanField(default=False, help_text='Needs help moving in an emergency')


class Vouch(models.Model):
    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='vouches')
    voucher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vouches_given')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['residence', 'voucher'], name='one_vouch_per_neighbour')]
