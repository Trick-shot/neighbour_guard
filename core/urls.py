from django.urls import path, include
from .views import PhoneNumberSendOTP, PhoneNumberVerifyOTP
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet

router = DefaultRouter()
router.register('users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('send-otp/', PhoneNumberSendOTP.as_view(), name='send-otp'),
    path('verify-otp/', PhoneNumberVerifyOTP.as_view(), name='verify-otp'),
]
