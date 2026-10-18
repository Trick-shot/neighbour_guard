from django.contrib.auth import get_user_model
from rest_framework import serializers

from djoser.serializers import UserSerializer as BaseUserSerializer, UserCreateSerializer as BaseUserCreateSerializer

from core.models import EmergencyContact
from core.phone import normalise_tz_phone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer


class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        fields = ["id", "email", "full_name", "password"]


class UserSerializer(BaseUserSerializer):
    """`/api/auth/users/me/` — what the signed-in user may see and change about themselves.

    The phone is read-only here on purpose: it only reaches the profile through
    `POST /api/auth/verify-otp/`, after the user proves they hold the number.
    """
    phone_number = serializers.SerializerMethodField()
    is_phone_verified = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = ["id", "email", "full_name", "phone_number", "is_phone_verified",
                  "is_admin", "is_superuser", "is_active", "is_staff"]
        read_only_fields = ["email", "phone_number", "is_phone_verified",
                            "is_admin", "is_superuser", "is_active", "is_staff"]

    def _profile(self, obj):
        from main.models import Profile
        return Profile.objects.filter(user=obj).first()

    def get_phone_number(self, obj):
        profile = self._profile(obj)
        return profile.phone_number if profile else None

    def get_is_phone_verified(self, obj):
        profile = self._profile(obj)
        return bool(profile and profile.is_phone_verified)


class TokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    username_field = get_user_model().USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token


class PhoneNumberVerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        # No `user` field: it comes from the token, so it cannot be set from the body.
        fields = ['id', 'name', 'relation', 'phone']
        read_only_fields = ['id']

    def validate_phone(self, value):
        number = normalise_tz_phone(value)
        if not number:
            raise serializers.ValidationError('Enter a Tanzanian mobile number, like 0712 345 678.')
        return number
