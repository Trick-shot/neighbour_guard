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
