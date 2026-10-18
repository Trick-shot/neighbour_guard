"""SOS alerts: a server-owned countdown, then delivery. See the state diagram in docs/reference/backend.md."""
import uuid

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class Alert(models.Model):
    class Type(models.TextChoices):
        EMERGENCY = 'emergency', 'Emergency'
        ROBBERY = 'robbery', 'Robbery'
        FIRE = 'fire', 'Fire'
        MEDICAL = 'medical', 'Medical'
        SUSPICIOUS = 'suspicious', 'Suspicious activity'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending (countdown)'
        SENT = 'sent', 'Sent'
        CANCELLED = 'cancelled', 'Cancelled'
        RESOLVED = 'resolved', 'Resolved'

    class Channel(models.TextChoices):
        APP = 'app', 'App'
        SMS = 'sms', 'SMS fallback'

    client_id = models.UUIDField(unique=True, default=uuid.uuid4)
    # The short code an SMS carries instead of a full UUID (an SMS has no room, and nobody types
    # 36 characters under threat). When the app gets data back and retries with the real client_id,
    # `create_alert` finds this alert by its ref and adopts it, so one SOS never becomes two.
    sms_ref = models.CharField(max_length=8, blank=True, default='', db_index=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alerts_sent')
    residence = models.ForeignKey('places.Residence', on_delete=models.CASCADE, related_name='alerts')
    neighbourhood = models.ForeignKey('places.Neighbourhood', on_delete=models.CASCADE, related_name='alerts')
    type = models.CharField(max_length=12, choices=Type.choices, default=Type.EMERGENCY)
    message = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    channel = models.CharField(max_length=5, choices=Channel.choices, default=Channel.APP)

    send_at = models.DateTimeField(db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    radius_m = models.PositiveIntegerField(default=500)
    notified_count = models.PositiveIntegerField(default=0)
    # Set when "I'm safe" was confirmed with the duress PIN: the phone shows "resolved",
    # but responders keep the alert live and see this flag.
    under_duress = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_type_display()} from {self.residence} ({self.status})'

    @staticmethod
    def ref_for(client_id) -> str:
        """The 8-character code the phone prints in an SMS, derived from its own client_id."""
        return str(client_id).replace('-', '')[:8].lower()

    @property
    def is_live(self):
        return self.status == self.Status.SENT


class AlertResponse(models.Model):
    class State(models.TextChoices):
        SEEN = 'seen', 'Saw the alert'
        COMING = 'coming', 'On the way'
        ARRIVED = 'arrived', 'Arrived'
        CANT = 'cant', "Can't help"

    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='responses')
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alert_responses')
    state = models.CharField(max_length=8, choices=State.choices)
    eta_min = models.PositiveSmallIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['alert', 'responder'], name='one_response_per_responder')]


class SafetyPin(models.Model):
    """The PIN that confirms "I'm safe", and the duress PIN that only pretends to."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='safety_pin')
    pin_hash = models.CharField(max_length=128)
    duress_pin_hash = models.CharField(max_length=128)
    updated_at = models.DateTimeField(auto_now=True)

    def set_pins(self, pin: str, duress_pin: str):
        self.pin_hash = make_password(pin)
        self.duress_pin_hash = make_password(duress_pin)

    def match(self, value: str) -> str | None:
        """'ok', 'duress' or None. Both hashes are always checked, so timing does not reveal which matched."""
        ok = check_password(value, self.pin_hash)
        duress = check_password(value, self.duress_pin_hash)
        if ok:
            return 'ok'
        if duress:
            return 'duress'
        return None
