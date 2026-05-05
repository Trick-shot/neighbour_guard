from django.urls import path
from .views import PhoneNumberSendOTP, PhoneNumberVerifyOTP

urlpatterns = [
    path('send-otp/', PhoneNumberSendOTP.as_view(), name='send-otp'),
    path('verify-otp/', PhoneNumberVerifyOTP.as_view(), name='verify-otp'),
]
