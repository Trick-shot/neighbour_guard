from django.db.models import Model
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Residence, Location

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)

    class Meta:
        model = Profile
        fields = ['email', 'user', 'profile_pic', 'phone_number']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['latitude', 'longitude', 'latitude_delta', 'longitude_delta']


class ResidenceSerializer(serializers.ModelSerializer):
    residence_members = UserSerializer(many=True, read_only=True)
    email = serializers.EmailField(write_only=True)
    location = LocationSerializer(required=False, allow_null=True)

    class Meta:
        model = Residence
        fields = ['id', 'email', 'residence_members', 'residence_name', 'house_number', 'location', 'street_name',
                  'district']

    def update(self, instance, validated_data):
        location_data = validated_data.pop("location", None)

        if location_data:
            if instance.location:
                for attr, value in location_data.items():
                    setattr(instance.location, attr, value)
                instance.location.save()

            else:
                instance.location = Location.objects.create(**location_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
