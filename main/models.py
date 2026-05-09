from datetime import timedelta
from time import timezone
from django.db import models
from backend import settings
import hashlib


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    phone_number = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        default=''
    )

    is_phone_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.user.email


class OTPVerification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='otps'
    )
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    otp = models.CharField(max_length=64, null=True, blank=True)  # hashed
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    is_used = models.BooleanField(default=False, null=True, blank=True)
    attempts = models.IntegerField(default=0, null=True, blank=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(minutes=5)

    def is_locked(self):
        return self.attempts >= 3

    def __str__(self):
        return f"{self.phone_number} - {self.created_at}"


class Location(models.Model):
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    latitude_delta = models.FloatField(null=True, blank=True)
    longitude_delta = models.FloatField(null=True, blank=True)


class Residence(models.Model):
    residence_members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="residences")
    residence_name = models.CharField(max_length=100, null=True)
    house_number = models.IntegerField()
    location = models.OneToOneField(Location, on_delete=models.CASCADE, null=True, blank=True)
    street_name = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.residence_name or "Unnamed Residence"
