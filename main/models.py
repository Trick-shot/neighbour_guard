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


class Residence(models.Model):
    residence_members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="residences")
    residence_name = models.CharField(max_length=100, null=True)
    house_number = models.IntegerField()
    location = models.OneToOneField(Location, on_delete=models.CASCADE, null=True, blank=True)
    street_name = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.residence_name or "Unnamed Residence"


from django.conf import settings
from django.db import models


class Issue(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    CATEGORY_CHOICES = [
        ('community', 'Community'),
        ('neighbours', 'Neighbours'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='community')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    residence = models.ForeignKey(
        'Residence',
        on_delete=models.SET_NULL,
        related_name='issues',
        null=True,
        blank=True
    )
    location = models.ForeignKey('Location', on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class IssueMedia(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='media')
    image = models.ImageField(upload_to='issues/')
    created_at = models.DateTimeField(auto_now_add=True)


class IssueComment(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.issue}"


class CommentLike(models.Model):
    comment = models.ForeignKey(IssueComment, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['comment', 'user']


# main/models.py

class NeighbourRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_requests'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_requests'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['sender', 'receiver']

    def __str__(self):
        return f"{self.sender} → {self.receiver} ({self.status})"


class NeighbourCommunity(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='communities'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_communities'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class GroupChat(models.Model):
    community = models.OneToOneField(
        NeighbourCommunity,
        on_delete=models.CASCADE,
        related_name='chat'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat - {self.community.name}"


class ChatMessage(models.Model):
    chat = models.ForeignKey(
        GroupChat,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} - {self.message[:30]}"


class Alert(models.Model):
    ALERT_TYPES = [
        ('emergency', 'Emergency'),
        ('suspicious', 'Suspicious Activity'),
        ('fire', 'Fire'),
        ('medical', 'Medical'),
        ('other', 'Other'),
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_alerts'
    )
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='emergency')
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.full_name} - {self.alert_type} - {self.created_at}"


class Conversation(models.Model):
    CONVERSATION_TYPES = [
        ('direct', 'Direct'),
        ('group', 'Group'),
    ]
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    conversation_type = models.CharField(max_length=10, choices=CONVERSATION_TYPES, default='direct')
    name = models.CharField(max_length=100, null=True, blank=True)  # for group chats
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.conversation_type} - {self.id}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} - {self.created_at}"
