from rest_framework import serializers
from .models import Profile, Residence


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['user', 'profile_pic', 'phone_number']


class ResidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Residence
        fields = ['id', 'residence_name', 'house_number', 'location', 'street_name', 'district']
