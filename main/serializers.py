from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Residence, Location

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['user', 'profile_pic', 'phone_number']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['latitude', 'longitude', 'latitude_delta', 'longitude_delta']


class ResidenceSerializer(serializers.ModelSerializer):
    residence_members = UserSerializer()
    location = LocationSerializer(required=False, allow_null=True)

    class Meta:
        model = Residence
        fields = ['id', 'residence_members', 'residence_name', 'house_number', 'location', 'street_name', 'district']

    def create(self, validated_data):
        email = validated_data.get('email')

    def update(self, instance, validated_data):
        location_data = validated_data.pop('location', None)

        # update residence fields
        instance.residence_name = validated_data.get('residence_name', instance.residence_name)
        instance.house_number = validated_data.get('house_number', instance.house_number)
        instance.street_name = validated_data.get('street_name', instance.street_name)
        instance.district = validated_data.get('district', instance.district)
        instance.save()

        # handle location
        if location_data:
            if instance.location:
                # ✅ update existing location
                location = instance.location
                location.latitude = location_data.get('latitude', location.latitude)
                location.longitude = location_data.get('longitude', location.longitude)
                location.latitude_delta = location_data.get('latitude_delta', location.latitude_delta)
                location.longitude_delta = location_data.get('longitude_delta', location.longitude_delta)
                location.save()
            else:
                # ✅ create new location
                location = Location.objects.create(**location_data)
                instance.location = location
                instance.save()

        return instance
