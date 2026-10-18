import hmac
import logging
import secrets
import hashlib
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from main.models import OTPVerification, Profile
from djoser.views import UserViewSet

from core.sms import send_sms

logger = logging.getLogger(__name__)


class CustomUserViewSet(UserViewSet):
    def get_permissions(self):
        public_actions = [
            'create',  # POST /users/
            'activation',  # POST /users/activation/
            'resend_activation',  # POST /users/resend_activation/
            'reset_password',  # POST /users/reset_password/
            'reset_password_confirm',  # POST /users/reset_password_confirm/
        ]
        if self.action in public_actions:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            super().perform_create(serializer)
        except Exception as e:
            # delete user if email sending fails
            if serializer.instance:
                serializer.instance.delete()
            raise e


def hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def format_phone_number(phone: str) -> str:
    phone = phone.replace(' ', '').replace('-', '')
    if phone.startswith('0'):
        return '+255' + phone[1:]
    if phone.startswith('255'):
        return '+' + phone
    return phone


class MinuteWindowThrottle(UserRateThrottle):
    """Like UserRateThrottle, but also understands rates such as '3/10min'."""

    def parse_rate(self, rate):
        if rate and rate.endswith('min'):
            num, period = rate.split('/')
            minutes = int(period[:-3] or 1)
            return int(num), minutes * 60
        return super().parse_rate(rate)


class OTPSendThrottle(MinuteWindowThrottle):
    scope = 'otp_send'


class OTPVerifyThrottle(MinuteWindowThrottle):
    scope = 'otp_verify'


class PhoneNumberSendOTP(APIView):
    """Send a code to a phone number the logged-in user wants to add.

    The number is only stored on the OTP record. It reaches the profile in
    PhoneNumberVerifyOTP, after the user proves they own it.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPSendThrottle]

    def post(self, request):
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = format_phone_number(phone_number)
        OTPVerification.objects.filter(user=request.user, is_used=False).delete()

        otp_code = f'{secrets.randbelow(1_000_000):06d}'
        OTPVerification.objects.create(
            user=request.user,
            phone_number=phone_number,
            otp=hash_otp(otp_code),
            is_used=False,
            attempts=0,
        )

        sent = send_sms(f'Your NeighbourGuard verification code is {otp_code}. Valid for 10 minutes.', [phone_number])
        if not sent and settings.DEBUG:
            # Local development only: lets you finish sign-up without SMS credentials.
            logger.debug('DEBUG OTP for user %s: %s', request.user.pk, otp_code)

        return Response({'message': 'OTP sent'}, status=status.HTTP_200_OK)


class PhoneNumberVerifyOTP(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        user_otp = str(request.data.get('otp', ''))
        if not user_otp:
            return Response({'error': 'OTP is required'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = OTPVerification.objects.filter(user=request.user, is_used=False).order_by('-created_at').first()
        if not otp_record:
            return Response({'error': 'OTP not found'}, status=status.HTTP_404_NOT_FOUND)
        if otp_record.is_locked():
            return Response({'error': 'Too many attempts. Request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp_record.is_expired():
            return Response({'error': 'OTP expired. Request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.attempts += 1
        otp_record.save(update_fields=['attempts'])

        if not hmac.compare_digest(otp_record.otp, hash_otp(user_otp)):
            remaining = max(0, OTPVerification.MAX_ATTEMPTS - otp_record.attempts)
            return Response({'error': f'Invalid OTP. {remaining} attempts remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.phone_number = otp_record.phone_number
        profile.is_phone_verified = True
        profile.save(update_fields=['phone_number', 'is_phone_verified'])

        return Response({'message': 'Phone number verified', 'phone_number': profile.phone_number}, status=status.HTTP_200_OK)


# --- Passwordless sign-in with an email code (Figma: Sign in — email / code) -------------

EMAIL_CODE_TTL = 600  # 10 minutes
EMAIL_CODE_MAX_ATTEMPTS = 5


class EmailCodeThrottle(MinuteWindowThrottle):
    """Anonymous users have no user id, so throttle by IP."""
    scope = 'email_code'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


def _email_code_key(email: str) -> str:
    return f'email-code:{email.strip().lower()}'


class EmailCodeRequestView(APIView):
    """POST {email} — email a 6-digit sign-in code. Always answers 200, so it cannot be used to
    find out which emails have accounts."""
    permission_classes = [AllowAny]
    throttle_classes = [EmailCodeThrottle]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.core.cache import cache
        from django.core.mail import send_mail

        email = (request.data.get('email') or '').strip().lower()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user:
            code = f'{secrets.randbelow(1_000_000):06d}'
            cache.set(_email_code_key(email), {'hash': hash_otp(code), 'attempts': 0}, EMAIL_CODE_TTL)
            try:
                send_mail('Your NeighbourGuard sign-in code',
                          f'Your code is {code}. It expires in 10 minutes. If you did not ask for it, ignore this email.',
                          settings.DEFAULT_FROM_EMAIL, [user.email])
            except Exception:
                logger.exception('Sign-in code email failed for user %s', user.pk)
        return Response({'message': 'If that email has an account, a code is on its way.'})


class EmailCodeVerifyView(APIView):
    """POST {email, code} → {access, refresh}."""
    permission_classes = [AllowAny]
    throttle_classes = [EmailCodeThrottle]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.core.cache import cache
        from rest_framework_simplejwt.tokens import RefreshToken

        email = (request.data.get('email') or '').strip().lower()
        code = str(request.data.get('code') or '')
        key = _email_code_key(email)
        entry = cache.get(key)
        if not entry:
            return Response({'error': 'Code expired. Request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        if entry['attempts'] >= EMAIL_CODE_MAX_ATTEMPTS:
            cache.delete(key)
            return Response({'error': 'Too many attempts. Request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
        if not hmac.compare_digest(entry['hash'], hash_otp(code)):
            entry['attempts'] += 1
            cache.set(key, entry, EMAIL_CODE_TTL)
            return Response({'error': 'That code is not right.'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(key)
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response({'error': 'Account not found.'}, status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})
