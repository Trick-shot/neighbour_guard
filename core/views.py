import hmac
import logging
import secrets
import hashlib
from django.conf import settings
from django.db import IntegrityError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from core.models import EmergencyContact
from core.serializers import EmergencyContactSerializer
from main.models import OTPVerification, Profile
from djoser.views import UserViewSet

from core.phone import format_phone_number
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
    """POST {email} — email a 6-digit code. It signs in an existing account and signs up a new one.

    It always answers the same 200, so it cannot be used to find out which emails have accounts.
    A deactivated account gets nothing: staff switched it off, and a code must not switch it back on.
    """
    permission_classes = [AllowAny]
    throttle_classes = [EmailCodeThrottle]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.core.cache import cache
        from django.core.exceptions import ValidationError
        from django.core.mail import send_mail
        from django.core.validators import validate_email

        email = (request.data.get('email') or '').strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Enter an email address you can open now.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user = get_user_model().objects.filter(email__iexact=email).first()
        if user is None or user.is_active:
            code = f'{secrets.randbelow(1_000_000):06d}'
            cache.set(_email_code_key(email), {'hash': hash_otp(code), 'attempts': 0}, EMAIL_CODE_TTL)
            try:
                send_mail('Your NeighbourGuard code',
                          f'Your code is {code}. It expires in 10 minutes. If you did not ask for it, ignore this email.',
                          settings.DEFAULT_FROM_EMAIL, [email])
            except Exception:
                logger.exception('Email code failed to send (user %s)', user.pk if user else 'new')
        return Response({'message': 'A code is on its way if this address can receive it.'})


class SmsCodeRequestView(APIView):
    """POST {email} — "Can't access your email?": text the sign-in code to the account's verified
    phone instead. The code is verified by the same `email-code/verify/` endpoint.

    Same answer whether or not the account or the phone exists, so it reveals nothing.
    """
    permission_classes = [AllowAny]
    throttle_classes = [EmailCodeThrottle]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.core.cache import cache

        from core.tasks import send_sign_in_code_sms

        email = (request.data.get('email') or '').strip().lower()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first() if email else None
        profile = Profile.objects.filter(user=user, is_phone_verified=True).first() if user else None
        if profile and profile.phone_number:
            code = f'{secrets.randbelow(1_000_000):06d}'
            cache.set(_email_code_key(email), {'hash': hash_otp(code), 'attempts': 0}, EMAIL_CODE_TTL)
            send_sign_in_code_sms.delay(profile.phone_number, code)
        return Response({'message': 'If this account has a verified phone, a code is on its way.'})


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
        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if user is not None and not user.is_active:
            return Response({'error': 'This account is switched off. Contact support.'},
                            status=status.HTTP_400_BAD_REQUEST)
        is_new = user is None
        if is_new:
            # The code just proved the address is theirs, so the account starts active. The name
            # comes next, on the onboarding profile screen.
            user = User.objects.create_user(email=email, password=None, full_name='')
            user.set_unusable_password()
            user.save(update_fields=['password'])
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh),
                         'is_new': is_new or not user.full_name})


class MyPhotoView(APIView):
    """POST /api/auth/users/me/photo/ (multipart `photo`) — my profile picture. DELETE removes it.

    Only ever my own: the profile comes from the token. The bytes are sniffed, because the
    client's Content-Type is a claim anyone can make.
    """
    MAX_BYTES = 5 * 1024 * 1024

    def post(self, request):
        from chat.files import sniff
        upload = request.FILES.get('photo')
        if upload is None:
            return Response({'detail': 'Choose a photo.'}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > self.MAX_BYTES:
            return Response({'detail': 'That photo is over 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        head = upload.read(32)
        upload.seek(0)
        if sniff(head) not in ('image/jpeg', 'image/png', 'image/webp'):
            return Response({'detail': 'Use a JPEG, PNG or WebP photo.'}, status=status.HTTP_400_BAD_REQUEST)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.profile_pic:
            profile.profile_pic.delete(save=False)
        profile.profile_pic.save(f'{request.user.pk}-{secrets.token_hex(6)}.img', upload, save=True)
        return Response({'photo_url': request.build_absolute_uri(profile.profile_pic.url)})

    def delete(self, request):
        profile = Profile.objects.filter(user=request.user).first()
        if profile and profile.profile_pic:
            profile.profile_pic.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MySafetyProfileView(APIView):
    """GET / PUT /api/auth/users/me/safety/ — {skills[], conditions, allergies, blood_type}. Mine only."""

    def _data(self, sp):
        return {'skills': sp.skills if sp else [], **(sp.notes() if sp else {'conditions': '', 'allergies': '', 'blood_type': ''})}

    def get(self, request):
        from core.models import SafetyProfile
        return Response(self._data(SafetyProfile.objects.filter(user=request.user).first()))

    def put(self, request):
        from core.crypto import encrypt
        from core.models import SafetyProfile
        skills = request.data.get('skills') or []
        if not isinstance(skills, list) or any(s not in SafetyProfile.SKILLS for s in skills):
            return Response({'detail': 'Unknown skill.'}, status=status.HTTP_400_BAD_REQUEST)
        fields = {}
        for name, limit in (('conditions', 200), ('allergies', 200), ('blood_type', 5)):
            value = str(request.data.get(name) or '').strip()
            if len(value) > limit:
                return Response({'detail': f'{name} is too long.'}, status=status.HTTP_400_BAD_REQUEST)
            fields[f'{name}_enc'] = encrypt(value)
        sp, _ = SafetyProfile.objects.update_or_create(user=request.user, defaults={'skills': sorted(set(skills)), **fields})
        return Response(self._data(sp))


class EmergencyContactsView(APIView):
    """GET / POST /api/v2/contacts/ — the people texted when I send an SOS.

    They are mine and only mine: the list is always filtered by `request.user`, and the serializer
    has no `user` field, so a body naming someone else changes nothing.
    """

    def get(self, request):
        contacts = EmergencyContact.objects.filter(user=request.user)
        return Response(EmergencyContactSerializer(contacts, many=True).data)

    def post(self, request):
        if EmergencyContact.objects.filter(user=request.user).count() >= EmergencyContact.MAX_PER_USER:
            return Response({'detail': f'You can have {EmergencyContact.MAX_PER_USER} emergency contacts.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = EmergencyContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(user=request.user)
        except IntegrityError:
            return Response({'detail': 'That number is already one of your contacts.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmergencyContactView(APIView):
    """PATCH / DELETE /api/v2/contacts/<id>/ — one of my own contacts."""

    def _get(self, request, pk):
        # Filtered by user, so someone else's contact is a 404: you may not know it exists.
        return EmergencyContact.objects.filter(pk=pk, user=request.user).first()

    def patch(self, request, pk):
        contact = self._get(request, pk)
        if not contact:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmergencyContactSerializer(contact, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        contact = self._get(request, pk)
        if not contact:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyDataExportView(APIView):
    """GET /api/auth/users/me/export/ — "Download my data" (Figma 1634:2692).

    Everything the server keeps about me, as JSON. Medical notes are decrypted for me alone.
    Other people's data (who vouched, who responded) is reduced to counts or first names.
    """

    def get(self, request):
        from alerts.models import Alert
        from issues.models import Issue
        from main.models import Profile
        from places.services import residence_of
        from .models import SafetyProfile

        u = request.user
        home = residence_of(u)
        safety = SafetyProfile.objects.filter(user=u).first()
        data = {
            'account': {'email': u.email, 'full_name': u.full_name, 'joined': u.date_joined,
                        'phone_number': getattr(Profile.objects.filter(user=u).first(), 'phone_number', None) or None},
            'home': None if not home else {
                'house_number': home.house_number, 'street': home.street, 'district': home.district,
                'directions': home.directions, 'lat': home.lat, 'lng': home.lng, 'status': home.status,
                'household': list(home.household.values('name', 'relation', 'age_group', 'needs_help')),
            },
            'emergency_contacts': list(u.emergency_contacts.values('name', 'relation', 'phone')),
            'safety': None if not safety else {'skills': safety.skills, **safety.notes()},
            'alerts_sent': list(Alert.objects.filter(sender=u).values('type', 'status', 'created_at', 'sent_at', 'resolved_at')),
            'issues_reported': list(Issue.objects.filter(created_by=u).values('title', 'category', 'status', 'created_at')),
        }
        return Response(data, headers={'Content-Disposition': 'attachment; filename="neighbourguard-my-data.json"'})


class DeleteAccountView(APIView):
    """POST /api/auth/users/me/delete/ {confirm: "DELETE"} — Figma "Delete account".

    Sign-in is by emailed code, so there is no password to re-type; typing DELETE is the guard.
    The account is switched off and personal details are wiped at once. Rows other people rely on
    (an alert they answered, a comment in their thread) stay, under the name "Former neighbour".
    """

    def post(self, request):
        from django.db import transaction
        from places.models import ResidenceMember

        if request.data.get('confirm') != 'DELETE':
            return Response({'detail': 'Type DELETE to confirm.'}, status=status.HTTP_400_BAD_REQUEST)
        u = request.user
        with transaction.atomic():
            u.emergency_contacts.all().delete()
            ResidenceMember.objects.filter(user=u).delete()
            from .models import SafetyProfile
            SafetyProfile.objects.filter(user=u).delete()
            from main.models import Profile
            for profile in Profile.objects.filter(user=u):
                if profile.profile_pic:
                    profile.profile_pic.delete(save=False)
                profile.delete()
            u.full_name = 'Former neighbour'
            u.push_token = None
            u.is_active = False
            u.email = f'deleted-{u.pk}@deleted.invalid'
            u.set_unusable_password()
            u.save()
        logger.info('Account %s deleted by its owner', u.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
