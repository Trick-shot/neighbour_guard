"""Thin wrapper around Africa's Talking so the SDK is only initialised when used."""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)
_sms = None


def _client():
    global _sms
    if _sms is None:
        import africastalking

        africastalking.initialize(settings.AFRICASTALKING_USERNAME, settings.AFRICASTALKING_API_KEY)
        _sms = africastalking.SMS
    return _sms


def send_sms(message: str, recipients: list[str]) -> bool:
    """Send one SMS to many numbers. Returns False instead of raising, and never logs the message body."""
    if not recipients:
        return True
    if not settings.AFRICASTALKING_API_KEY:
        logger.warning('SMS not sent: Africa\'s Talking is not configured (%d recipients)', len(recipients))
        return False
    try:
        _client().send(message, recipients)
        return True
    except Exception:  # the SDK raises plain Exceptions
        logger.exception('SMS send failed for %d recipients', len(recipients))
        return False
