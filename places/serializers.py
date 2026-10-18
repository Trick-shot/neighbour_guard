"""One serializer per audience. A field that is not in a serializer cannot leak."""
from rest_framework import serializers

from .models import HouseholdPerson, Neighbourhood, Residence


class NeighbourhoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Neighbourhood
        fields = ['id', 'name', 'slug', 'radius_m']


class ResidenceCreateSerializer(serializers.Serializer):
    house_number = serializers.CharField(max_length=20)
    street = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    directions = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class MyResidenceSerializer(serializers.ModelSerializer):
    """For the residence's own members: their own exact location is theirs to see."""
    neighbourhood = NeighbourhoodSerializer(read_only=True)
    vouches = serializers.IntegerField(source='vouches.count', read_only=True)
    vouches_needed = serializers.SerializerMethodField()

    class Meta:
        model = Residence
        fields = ['id', 'house_number', 'street', 'district', 'directions', 'lat', 'lng', 'status',
                  'verified_at', 'neighbourhood', 'vouches', 'vouches_needed']
        read_only_fields = ['status', 'verified_at']

    def get_vouches_needed(self, obj):
        return Residence.VOUCHES_NEEDED


class ResidenceNeighbourSerializer(serializers.ModelSerializer):
    """Verified neighbours: house number and street, no coordinates, no distance."""
    class Meta:
        model = Residence
        fields = ['id', 'house_number', 'street', 'status']


class ResidencePublicSerializer(serializers.ModelSerializer):
    """Unverified members and other areas: the street only."""
    class Meta:
        model = Residence
        fields = ['id', 'street', 'status']


class HouseholdPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseholdPerson
        fields = ['id', 'name', 'age_group', 'needs_help']
        read_only_fields = ['id']


class ResidenceResponderSerializer(serializers.ModelSerializer):
    """Responders to a live alert from this home only: exact pin, directions, who is inside."""
    household = HouseholdPersonSerializer(many=True, read_only=True)

    class Meta:
        model = Residence
        fields = ['id', 'house_number', 'street', 'directions', 'lat', 'lng', 'household']
