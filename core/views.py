import random
import africastalking
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.conf import settings

from main.models import OtpVerification, Profile


class PhoneNumberSendOTP(APIView):
    def post(self, request):
        phone_number = request.data.get("phone_number")
        email = request.data.get("email")

        if not phone_number or not email:
            return Response({"error": "Phone number and email are required"}, status=status.HTTP_400_BAD_REQUEST)

        # 🔍 Get user safely
        user = get_object_or_404(Profile, user__email=email)

        # 🔢 Generate OTP first
        otp_code = str(random.randint(100000, 999999))

        # 💾 Save OTP
        otp_model = OtpVerification.objects.create(
            phone_number=phone_number,
            otp=otp_code
        )

        # 📱 Update user phone number
        user.phone_number = phone_number
        user.save(update_fields=['phone_number'])

        # 📩 Send SMS
        sms = africastalking.SMS
        message = f"Your verification code is {otp_code}"

        try:
            sms.send(message, [phone_number])
        except Exception as e:
            return Response(
                {"error": "Failed to send SMS", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"message": "OTP sent successfully"},
            status=status.HTTP_200_OK
        )


class PhoneNumberVerifyOTP(APIView):
    def post(self, request):
        phone_number = request.data.get("phone_number")
        user_otp = request.data.get("otp")

        otp_record = OtpVerification.objects.filter(phone_number=phone_number).order_by('-created_at').first()

        if not otp_record:
            return Response({"error": "OTP not found"}, status=status.HTTP_404_NOT_FOUND)

        if timezone.now() - otp_record.created_at > timedelta(minutes=5):
            return Response({"error": "OTP expired"}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.code != user_otp:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.save()

        return Response({"message": "Phone number verified successfully"}, status=status.HTTP_200_OK)
