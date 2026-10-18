"""Chat background work."""
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Attachment

UNUSED_AFTER_HOURS = 24


@shared_task(ignore_result=True)
def delete_unused_attachments():
    """Remove uploads that never reached a message.

    An upload that is abandoned (the app was killed, the send failed) would otherwise sit on disk
    for ever. Deleting the row deletes nothing on disk by itself, so the file goes too.
    """
    cutoff = timezone.now() - timedelta(hours=UNUSED_AFTER_HOURS)
    stale = Attachment.objects.filter(message__isnull=True, created_at__lt=cutoff)
    removed = 0
    for attachment in stale.iterator():
        attachment.file.delete(save=False)
        attachment.delete()
        removed += 1
    return removed
