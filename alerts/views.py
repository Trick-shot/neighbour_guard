from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from core.views import MinuteWindowThrottle

from . import services
from .models import Alert, SafetyPin
from .serializers import (
    AlertCreateSerializer, AlertSenderSerializer, ChangeTypeSerializer, AlertSerializer, RespondSerializer, ResolveSerializer,
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


class ChangeTypeView(APIView):
    def post(self, request, pk):
        alert = visible_alert(request, pk)
        data = ChangeTypeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            alert = services.change_type(alert, request.user, data.validated_data['type'])
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


class WitnessThrottle(MinuteWindowThrottle):
    """By IP, signed in or not: a witness report can wake a street, so it must be rare."""
    scope = 'witness'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class WitnessView(APIView):
    """POST /api/v2/alerts/witness/ — {client_id, type, lat, lng, street?, description?, photo?}.

    AllowAny on purpose (passers-by have no account). The reporter is never returned or shown.
    Retrying with the same client_id returns the same report instead of a second push.
    """
    permission_classes = [AllowAny]
    throttle_classes = [WitnessThrottle]

    def post(self, request):
        import uuid

        from django.db import transaction

        from chat.files import sniff

        from .models import WitnessReport
        from .tasks import fan_out_witness

        try:
            client_id = uuid.UUID(str(request.data.get('client_id')))
            lat, lng = float(request.data.get('lat')), float(request.data.get('lng'))
        except (TypeError, ValueError):
            return Response({'detail': 'client_id, lat and lng are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return Response({'detail': 'That location is not on Earth.'}, status=status.HTTP_400_BAD_REQUEST)
        kind = request.data.get('type') or Alert.Type.SUSPICIOUS
        if kind not in Alert.Type.values:
            return Response({'detail': 'Unknown type.'}, status=status.HTTP_400_BAD_REQUEST)
        existing = WitnessReport.objects.filter(client_id=client_id).first()
        if existing:
            return Response(_witness_data(existing))
        photo = request.FILES.get('photo')
        if photo is not None:
            head = photo.read(32)
            photo.seek(0)
            if photo.size > 10 * 1024 * 1024 or sniff(head) not in ('image/jpeg', 'image/png', 'image/webp'):
                return Response({'detail': 'Use a JPEG, PNG or WebP photo under 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        from places.services import residences_near
        report = WitnessReport.objects.create(
            client_id=client_id, type=kind, lat=lat, lng=lng,
            street=str(request.data.get('street') or '')[:100],
            description=str(request.data.get('description') or '')[:500],
            reporter=request.user if request.user.is_authenticated else None,
            notified_count=len(residences_near(lat, lng, WitnessReport.RADIUS_M)),
        )
        if photo is not None:
            report.photo.save(f'{report.pk}.img', photo, save=True)
        transaction.on_commit(lambda: fan_out_witness.delay(report.id))
        return Response(_witness_data(report), status=status.HTTP_201_CREATED)


def _witness_data(report):
    # Homes in range, not people: the count the reporter sees must not reveal who lives where.
    return {'id': report.id, 'type': report.type, 'homes_alerted': report.notified_count,
            'radius_m': report.RADIUS_M, 'created_at': report.created_at}


class HistoryView(APIView):
    """GET /api/v2/alerts/history/ — Figma "My alert history" (1634:2762).

    Only my own record: alerts I sent (not cancelled ones: those never went out) and alerts I
    answered "coming" to. No coordinates, no names of other responders.
    """

    def get(self, request):
        from .models import AlertResponse

        sent = (Alert.objects.filter(sender=request.user, status__in=[Alert.Status.SENT, Alert.Status.RESOLVED])
                .select_related('residence').order_by('-sent_at')[:50])
        helped = (AlertResponse.objects.filter(responder=request.user, state__in=['coming', 'arrived'])
                  .select_related('alert__residence', 'alert__sender').order_by('-created_at')[:50])
        waits = []
        for a in sent:
            first = (a.responses.filter(state__in=['coming', 'arrived']).order_by('created_at')
                     .values_list('created_at', flat=True).first())
            if first and a.sent_at:
                waits.append(max(0, (first - a.sent_at).total_seconds()))

        def row(a, mine):
            return {
                'id': a.id, 'type': a.type, 'status': a.status, 'message': a.message,
                'sent_at': a.sent_at, 'resolved_at': a.resolved_at,
                'house_number': a.residence.house_number, 'street': a.residence.street,
                'sender_name': None if mine else a.sender.full_name,
                'responded': a.responses.filter(state__in=['coming', 'arrived']).count(),
            }

        return Response({
            'sent_count': Alert.objects.filter(sender=request.user, status__in=[Alert.Status.SENT, Alert.Status.RESOLVED]).count(),
            'helped_count': AlertResponse.objects.filter(responder=request.user, state__in=['coming', 'arrived']).count(),
            'avg_first_response_s': round(sum(waits) / len(waits)) if waits else None,
            'sent': [row(a, True) for a in sent],
            'helped': [row(r.alert, False) for r in helped],
        })
