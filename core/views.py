import random
import hashlib
import africastalking
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from main.models import OTPVerification, Profile
from djoser.views import UserViewSet


class CustomUserViewSet(UserViewSet):
    def get_permissions(self):
        public_actions = [
            'create',  # POST /users/
            'activation',  # POST /users/activation/
            'resend_activation',  # POST /users/resend_activation/
            'reset_password',  # POST /users/reset_password/
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


class PhoneNumberSendOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get("phone_number")
        email = request.data.get("email")

        if not phone_number or not email:
            return Response(
                {"error": "Phone number and email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # format phone number
        phone_number = format_phone_number(phone_number)

        # get user profile by email
        profile = get_object_or_404(Profile, user__email=email)

        # delete old unused OTPs
        OTPVerification.objects.filter(
            phone_number=phone_number,
            is_used=False
        ).delete()

        # generate and hash OTP
        otp_code = str(random.randint(100000, 999999))

        OTPVerification.objects.create(
            user=profile.user,
            phone_number=phone_number,
            otp=hash_otp(otp_code),
            is_used=False,
            attempts=0
        )

        # update phone number on profile
        profile.phone_number = phone_number
        profile.save(update_fields=['phone_number'])

        # send SMS
        sms = africastalking.SMS
        message = f"Your NeighbourGuard verification code is {otp_code}. Valid for 10 minutes."

        try:
            response = sms.send(message, [phone_number])
            print(f"=============================")
            print(f"OTP for {phone_number}: {otp_code}")
            print(f"SMS Response: {response}")
            print(f"=============================")
        except Exception as e:
            # print OTP in terminal even if SMS fails
            print(f"=============================")
            print(f"SMS FAILED - OTP for {phone_number}: {otp_code}")
            print(f"Error: {str(e)}")
            print(f"=============================")

        # always return success so user can proceed
        return Response(
            {"message": "OTP sent successfully"},
            status=status.HTTP_200_OK
        )


class PhoneNumberVerifyOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get("phone_number")
        user_otp = request.data.get("otp")

        if not phone_number or not user_otp:
            return Response(
                {"error": "Phone number and OTP are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # format phone number
        phone_number = format_phone_number(phone_number)

        otp_record = OTPVerification.objects.filter(
            phone_number=phone_number,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            return Response(
                {"error": "OTP not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # check locked
        if otp_record.attempts >= 3:
            return Response(
                {"error": "Too many attempts. Request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # check expired
        if timezone.now() - otp_record.created_at > timedelta(minutes=10):
            return Response(
                {"error": "OTP expired. Request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # increment attempts first
        otp_record.attempts += 1
        otp_record.save(update_fields=['attempts'])

        # compare hashes
        if otp_record.otp != hash_otp(user_otp):
            remaining = 3 - otp_record.attempts
            return Response(
                {"error": f"Invalid OTP. {remaining} attempts remaining."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # mark as used
        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        # mark profile phone as verified
        profile = get_object_or_404(Profile, user=otp_record.user)
        profile.is_phone_verified = True
        profile.save(update_fields=['is_phone_verified'])

        return Response(
            {"message": "Phone number verified successfully"},
            status=status.HTTP_200_OK
        )
