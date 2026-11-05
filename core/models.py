from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    is_admin = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    push_token = models.CharField(max_length=255, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    # Everything in the notifications feed newer than this is unread (the bell's badge).
    notifications_seen_at = models.DateTimeField(null=True, blank=True)
    # "Text them when it's resolved" (Figma 1634:2469): emergency contacts also get an all-clear.
    text_contacts_on_resolve = models.BooleanField(default=True)
    # "Alarm & notifications" (Figma 1634:2529). Routine pushes only (issues, messages): an SOS
    # ignores both, because a neighbour's emergency must always ring.
    routine_push = models.BooleanField(default=True)
    quiet_from = models.TimeField(null=True, blank=True)
    quiet_to = models.TimeField(null=True, blank=True)

    def wants_routine_push(self, at=None) -> bool:
        """False when routine pushes are off, or `at` (local time) falls in my quiet hours."""
        if not self.routine_push:
            return False
        if self.quiet_from is None or self.quiet_to is None:
            return True
        from django.utils import timezone
        t = (at or timezone.localtime()).time()
        if self.quiet_from <= self.quiet_to:
            return not (self.quiet_from <= t < self.quiet_to)
        return not (t >= self.quiet_from or t < self.quiet_to)  # crosses midnight, e.g. 22:00–06:00

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class EmergencyContact(models.Model):
    """Someone outside the neighbourhood who should be told when you send an SOS.

    Family, usually. They are texted when the alert goes out, because the people who care most are
    often not the people who are nearby.
    """

    MAX_PER_USER = 5

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='emergency_contacts')
    name = models.CharField(max_length=100)
    relation = models.CharField(max_length=40, blank=True, help_text='Mother, brother, landlord…')
    phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['user', 'phone'], name='one_contact_per_number'),
        ]

    def __str__(self):
        return f'{self.name} for {self.user_id}'


class SafetyProfile(models.Model):
    """Skills a neighbour can offer, and medical notes for responders.

    The notes are encrypted at rest (core/crypto.py) and leave the server only inside a live alert
    from this person, to the people allowed to see that alert exactly.
    """
    SKILLS = ['first_aid', 'nurse', 'doctor', 'security_guard', 'firefighting', 'has_car', 'electrician']

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='safety_profile')
    skills = models.JSONField(default=list, blank=True)
    conditions_enc = models.TextField(blank=True)
    allergies_enc = models.TextField(blank=True)
    blood_type_enc = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def notes(self) -> dict:
        from .crypto import decrypt
        return {'conditions': decrypt(self.conditions_enc), 'allergies': decrypt(self.allergies_enc),
                'blood_type': decrypt(self.blood_type_enc)}
