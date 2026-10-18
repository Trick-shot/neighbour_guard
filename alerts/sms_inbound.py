"""Inbound SMS: an SOS raised from a phone with no data connection.

This is the only endpoint that can raise an alert without a JWT, so it is the one place where an
attacker could try to put words in someone else's mouth. Three things guard it:

1. A shared secret in the URL (`SMS_INBOUND_SECRET`), checked first. Africa's Talking does not sign
   its callbacks, so without this anyone who can POST could forge a sender.
2. The sender's number must match a **verified** profile. A number nobody has proved they hold
   raises nothing.
3. The alert carries the short `ref` the phone printed in the message, so when the app gets data
   back and retries, `create_alert` adopts this alert instead of raising a second one.

The gateway gets 200 for everything it can retry nothing about, so it stops redelivering. Nothing
here logs the number or the message body.
"""
import hmac
import logging
import re

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.phone import normalise_tz_phone
from main.models import Profile

from . import services
from .models import Alert

logger = logging.getLogger(__name__)

REF = re.compile(r'\b([0-9a-f]{8})\b', re.IGNORECASE)
# Words that name a particular kind of emergency. "sos", "help" and "emergency" are not here: they
# say something is wrong without saying what, which is what the fallback already means.
SPECIFIC_TYPES = {t.value for t in Alert.Type} - {Alert.Type.EMERGENCY.value}


def parse(text: str) -> tuple[str, str]:
    """(type, ref) from an SMS body, in any order and any case.

    Never fails: a message nobody can parse is still an emergency. Someone texting this is not in a
    position to get the wording right.
    """
    words = re.findall(r'[a-z0-9]+', (text or '').lower())
    alert_type = next((w for w in words if w in SPECIFIC_TYPES), Alert.Type.EMERGENCY)
    match = REF.search(text or '')
    return alert_type, (match.group(1).lower() if match else '')


class InboundSmsView(APIView):
    """POST /api/v2/sms/inbound/ — Africa's Talking delivers an SMS here."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        secret = getattr(settings, 'SMS_INBOUND_SECRET', '')
        if not secret:
            # Refusing is the safe default: a misconfigured server must not accept forged senders.
            logger.error('Inbound SMS refused: SMS_INBOUND_SECRET is not set')
            return Response({'detail': 'Not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        supplied = request.query_params.get('key', '') or request.data.get('key', '')
        if not hmac.compare_digest(str(supplied), str(secret)):
            logger.warning('Inbound SMS refused: wrong key')
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

        number = normalise_tz_phone(request.data.get('from') or '')
        if not number:
            return Response({'received': True})

        profile = Profile.objects.select_related('user').filter(
            phone_number=number, is_phone_verified=True).first()
        if not profile or not profile.user or not profile.user.is_active:
            # Not an account we can act for. 200 so the gateway stops retrying; no number logged.
            logger.warning('Inbound SMS from a number with no verified profile')
            return Response({'received': True})

        alert_type, ref = parse(request.data.get('text') or '')

        if ref:
            existing = Alert.objects.filter(sms_ref=ref, sender=profile.user).first()
            if existing:
                return Response({'received': True, 'alert_id': existing.pk})

        try:
            # SMS alerts skip the countdown: the person already chose to send by texting.
            alert, _ = services.create_alert(profile.user, client_id=None, type=alert_type,
                                             channel=Alert.Channel.SMS, sms_ref=ref)
        except services.AlertError as e:
            logger.warning('Inbound SMS could not raise an alert: %s', e.code)
            return Response({'received': True})

        logger.info('Alert %s raised from an inbound SMS', alert.pk)
        return Response({'received': True, 'alert_id': alert.pk})
