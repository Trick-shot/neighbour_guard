# utils.py

import logging

import requests
from django.conf import settings
from geopy.distance import geodesic

logger = logging.getLogger(__name__)


def get_neighbours_within_radius(current_location, all_residences, radius_meters=30):
    neighbours = []
    for residence in all_residences:
        if residence.location:
            distance = geodesic(
                (current_location["latitude"], current_location["longitude"]),
                (residence.location.latitude, residence.location.longitude)
            ).meters
            if distance <= radius_meters:
                neighbours.append(residence)
    return neighbours


ALERT_LABELS = {
    "emergency": "🚨 Emergency Alert",
    "suspicious": "👁 Suspicious Activity",
    "fire": "🔥 Fire Alert",
    "medical": "🏥 Medical Emergency",
    "other": "⚠️ Alert",
}

CRITICAL_TYPES = ["emergency", "fire"]


def send_push_notifications(tokens: list, title: str, body: str, data: dict | None = None):
    data = data or {}
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "alerts",
            "data": data,
        }
        for token in tokens if token
    ]

    try:
        response = requests.post(
            settings.EXPO_PUSH_URL,
            json=messages,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.exception("Expo push failed for %d tokens", len(messages))
