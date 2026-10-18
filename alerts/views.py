from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Alert, SafetyPin
from .serializers import (
    AlertCreateSerializer, AlertSenderSerializer, AlertSerializer, RespondSerializer, ResolveSerializer,
    SafetyPinSerializer,
)

ERROR_STATUS = {
    'forbidden': status.HTTP_403_FORBIDDEN,
    'conflict': status.HTTP_409_CONFLICT,
    'no_home': status.HTTP_400_BAD_REQUEST,
    'invalid': status.HTTP_400_BAD_REQUEST,
}


def error(e: services.AlertError):
    return Response({'detail': str(e), 'code': e.code}, status=ERROR_STATUS.get(e.code, 400))


def render(alert, request):
    if alert.sender_id == request.user.id:
        return AlertSenderSerializer(alert, context={'can_see_exact': True}).data
    can_see = services.can_respond(request.user, alert)
    return AlertSerializer(alert, context={'can_see_exact': can_see}).data


def visible_alert(request, pk) -> Alert:
    """Sender, or a neighbour who may respond. Anyone else gets a 404, not a 403."""
    alert = get_object_or_404(Alert.objects.select_related('sender__profile', 'residence'), pk=pk)
    if alert.sender_id != request.user.id and not services.can_respond(request.user, alert):
        from django.http import Http404
        raise Http404
    return alert


class AlertListCreateView(APIView):
    """POST /api/v2/alerts/ starts the countdown. GET lists live alerts around me."""

    def get(self, request):
        alerts = services.active_alerts_for(request.user).select_related('sender', 'residence')
        return Response([render(a, request) for a in alerts])

    def post(self, request):
        data = AlertCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            alert, created = services.create_alert(request.user, **data.validated_data)
        except services.AlertError as e:
            return error(e)
        return Response(render(alert, request), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AlertDetailView(APIView):
    def get(self, request, pk):
        return Response(render(visible_alert(request, pk), request))


class CancelView(APIView):
    def post(self, request, pk):
        alert = visible_alert(request, pk)
        try:
            alert = services.cancel_alert(alert, request.user)
        except services.AlertError as e:
            return error(e)
        return Response(render(alert, request))


class SendNowView(APIView):
    def post(self, request, pk):
        alert = visible_alert(request, pk)
        try:
            alert = services.send_now(alert, request.user)
        except services.AlertError as e:
            return error(e)
        return Response(render(alert, request))


class RespondView(APIView):
    def post(self, request, pk):
        alert = visible_alert(request, pk)
        data = RespondSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            services.respond(alert, request.user, **data.validated_data)
        except services.AlertError as e:
            return error(e)
        alert.refresh_from_db()
        return Response(render(alert, request))


class ResolveView(APIView):
    def post(self, request, pk):
        alert = visible_alert(request, pk)
        data = ResolveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            alert = services.resolve(alert, request.user, data.validated_data.get('pin'))
        except services.AlertError as e:
            return error(e)
        return Response(render(alert, request))


class SafetyPinView(APIView):
    """PUT /api/v2/alerts/safety-pin/ {pin, duress_pin}. GET says whether PINs are set."""

    def get(self, request):
        return Response({'is_set': SafetyPin.objects.filter(user=request.user).exists()})

    def put(self, request):
        data = SafetyPinSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        pin, _ = SafetyPin.objects.get_or_create(user=request.user, defaults={'pin_hash': '', 'duress_pin_hash': ''})
        pin.set_pins(data.validated_data['pin'], data.validated_data['duress_pin'])
        pin.save()
        return Response({'is_set': True})


class PushTokenView(APIView):
    """POST /api/v2/alerts/push-token/ {token} — where this phone receives SOS pushes."""

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        if not token.startswith('ExponentPushToken[') and not token.startswith('ExpoPushToken['):
            return Response({'detail': 'Not an Expo push token.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.push_token = token
        request.user.save(update_fields=['push_token'])
        return Response({'saved': True})
