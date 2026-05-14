# utils.py

import requests
from django.conf import settings
from geopy.distance import geodesic


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


def send_push_notifications(tokens: list, title: str, body: str, data: dict = {}):
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
            "https://exp.host/--/api/v2/push/send",
            json=messages,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )
        print("Push notification response:", response.json())
    except Exception as e:
        print("Push notification error:", e)
