from django.urls import path, include
from .views import EmailCodeRequestView, EmailCodeVerifyView, MyPhotoView, MySafetyProfileView, PhoneNumberSendOTP, SmsCodeRequestView, PhoneNumberVerifyOTP
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet

router = DefaultRouter()
router.register('users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('users/me/photo/', MyPhotoView.as_view(), name='my-photo'),
    path('users/me/safety/', MySafetyProfileView.as_view(), name='my-safety'),
    path('', include(router.urls)),
    path('send-otp/', PhoneNumberSendOTP.as_view(), name='send-otp'),
    path('verify-otp/', PhoneNumberVerifyOTP.as_view(), name='verify-otp'),
    path('email-code/', EmailCodeRequestView.as_view(), name='email-code'),
    path('email-code/sms/', SmsCodeRequestView.as_view(), name='email-code-sms'),
    path('email-code/verify/', EmailCodeVerifyView.as_view(), name='email-code-verify'),
]
