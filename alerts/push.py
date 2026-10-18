"""Expo push delivery for SOS. Runs inside Celery tasks, never inside a request."""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
CHUNK = 100  # Expo accepts up to 100 messages per request

TITLES = {
    'emergency': 'Emergency nearby',
    'robbery': 'Robbery nearby',
    'fire': 'Fire nearby',
    'medical': 'Medical emergency nearby',
    'suspicious': 'Suspicious activity nearby',
    'other': 'Neighbour needs help',
}


def sos_message(token: str, title: str, body: str, data: dict) -> dict:
    return {
        'to': token,
        'title': title,
        'body': body,
        'data': data,
        'priority': 'high',
        # The phone creates an Android channel called "sos" with the alarm sound and max importance.
        'channelId': 'sos',
        'sound': 'alarm.mp3',
        # iOS: passes Focus modes. Ringing on silent needs Apple's Critical Alerts entitlement.
        'interruptionLevel': 'time-sensitive',
        'ttl': 300,
    }


def send(messages: list[dict]) -> int:
    """Send in chunks. Returns how many messages Expo accepted."""
    accepted = 0
    for i in range(0, len(messages), CHUNK):
        chunk = messages[i:i + CHUNK]
        try:
            r = requests.post(settings.EXPO_PUSH_URL, json=chunk, timeout=5,
                              headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
            r.raise_for_status()
            accepted += sum(1 for item in r.json().get('data', []) if item.get('status') == 'ok')
        except requests.RequestException:
            logger.exception('Expo push failed for a chunk of %d', len(chunk))
    return accepted
