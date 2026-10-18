"""v2 chat: one Message table with typed rows (text, alert card, issue card, media later)."""
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    class Kind(models.TextChoices):
        DIRECT = 'direct', 'Direct'
        GROUP = 'group', 'Group'

    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.DIRECT)
    name = models.CharField(max_length=100, blank=True)
    # Set for the automatic group of a neighbourhood; one such group per neighbourhood.
    neighbourhood = models.OneToOneField(
        'places.Neighbourhood', null=True, blank=True, on_delete=models.CASCADE, related_name='group'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f'{self.kind} #{self.pk}'


class Participant(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_participations')
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['conversation', 'user'], name='one_participant_row')]


class Message(models.Model):
    class Kind(models.TextChoices):
        TEXT = 'text', 'Text'
        ALERT = 'alert', 'Alert card'
        ISSUE = 'issue', 'Issue card'
        VOICE = 'voice', 'Voice note'
        PHOTO = 'photo', 'Photo'
        VIDEO = 'video', 'Video'
        FILE = 'file', 'Document'
        SYSTEM = 'system', 'System notice'

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name='chat_messages')
    # Made on the phone before the first try and kept across retries, so a retry never duplicates.
    client_id = models.UUIDField(null=True, blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.TEXT)
    body = models.TextField(blank=True)
    alert = models.ForeignKey('alerts.Alert', null=True, blank=True, on_delete=models.SET_NULL, related_name='messages')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [models.Index(fields=['conversation', 'created_at'])]
        constraints = [
            # NULL client_ids never collide (MySQL and SQLite allow many NULLs in a unique index).
            models.UniqueConstraint(fields=['sender', 'client_id'], name='message_idempotency'),
        ]
