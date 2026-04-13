from django.db import models

from backend import settings


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    profile_pic = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone_number = models.IntegerField(unique=True)

    def __str__(self):
        return self.user.email


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
    latitudeDelta = models.FloatField(null=True, blank=True)
    longitudeDelta = models.FloatField(null=True, blank=True)
