"""Providers, pools and payments. The phone never decides that money has moved."""
import hmac
import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from places.services import residence_of

from . import services
from .models import Payment, Plan, Subscription
from .serializers import MySubscriptionSerializer, PaymentSerializer, ProviderSerializer

logger = logging.getLogger(__name__)

CODES = {'no_home': status.HTTP_400_BAD_REQUEST, 'forbidden': status.HTTP_403_FORBIDDEN,
         'no_phone': status.HTTP_400_BAD_REQUEST, 'gateway': status.HTTP_503_SERVICE_UNAVAILABLE,
         'invalid': status.HTTP_400_BAD_REQUEST}


class ProviderListView(APIView):
    """GET /api/v2/providers/ — verified providers covering my area, with their plans."""

    def get(self, request):
        providers = services.providers_for(request.user)
        return Response(ProviderSerializer(providers, many=True).data)


class JoinPlanView(APIView):
    """POST / DELETE /api/v2/providers/plans/<id>/join/ — join or leave a street pool. Free."""

    def post(self, request, pk):
        plan = get_object_or_404(Plan, pk=pk)
        try:
            member = services.join_pool(request.user, plan)
        except services.PoolError as e:
            return Response({'detail': str(e)}, status=CODES.get(e.code, status.HTTP_400_BAD_REQUEST))
        subscription = member.subscription
        return Response(MySubscriptionSerializer(
            subscription, context={'residence': member.residence}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        services.leave_pool(request.user, get_object_or_404(Plan, pk=pk))
        return Response(status=status.HTTP_204_NO_CONTENT)


class MySubscriptionsView(APIView):
    """GET /api/v2/providers/subscriptions/ — the pools my home is in."""

    def get(self, request):
        home = residence_of(request.user)
        if not home:
            return Response([])
        subscriptions = (Subscription.objects.filter(members__residence=home)
                         .select_related('plan__provider').distinct())
        return Response(MySubscriptionSerializer(
            subscriptions, many=True, context={'residence': home}).data)


class PaymentView(APIView):
    """GET /api/v2/providers/payments/<id>/ — the phone polls this; it never decides `paid` itself."""

    def get(self, request, pk):
        # Scoped to the caller's own payments: someone else's is a 404.
        payment = Payment.objects.filter(pk=pk, member__user=request.user).first()
        if not payment:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(payment).data)


class MpesaCallbackView(APIView):
    """POST /api/v2/providers/mpesa/callback/?key=... — the gateway tells us a payment resolved.

    The only thing in the system that can mark a payment paid. Guarded by a shared secret, because
    an endpoint that moves money on an unauthenticated POST is worth forging.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        secret = getattr(settings, 'MPESA_CALLBACK_SECRET', '')
        if not secret:
            logger.error('Payment callback refused: MPESA_CALLBACK_SECRET is not set')
            return Response({'detail': 'Not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        supplied = request.query_params.get('key', '')
        if not hmac.compare_digest(str(supplied), str(secret)):
            logger.warning('Payment callback refused: wrong key')
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

        services.settle_payment(request.data if isinstance(request.data, dict) else {})
        # Always 200 once the key is right, so the gateway stops retrying a callback we have stored.
        return Response({'received': True})
