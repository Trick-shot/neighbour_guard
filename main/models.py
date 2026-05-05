from datetime import timedelta
from time import timezone
from django.db import models
from backend import settings


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    profile_pic = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone_number = models.IntegerField(unique=True)
    is_phone_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.user.email


class OtpVerification(models.Model):
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    otp = models.CharField(max_length=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Residence(models.Model):
    residence_members = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    residence_name = models.CharField(max_length=100, null=True, blank=True)
    house_number = models.IntegerField()
    location = models.OneToOneField('Location', on_delete=models.CASCADE, null=True, blank=True)
    street_name = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.residence_name


class Location(models.Model):
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    latitude_delta = models.FloatField(null=True, blank=True)
    longitude_delta = models.FloatField(null=True, blank=True)
