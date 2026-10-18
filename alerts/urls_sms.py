"""/api/v2/sms/ — the Africa's Talking inbound webhook (see docs/API-v2.md)."""
from django.urls import path

from .sms_inbound import InboundSmsView

urlpatterns = [
    path('inbound/', InboundSmsView.as_view(), name='sms-inbound'),
]
