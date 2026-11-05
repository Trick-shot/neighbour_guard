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


def gate_photo_url(residence, request):
    if not residence.gate_photo:
        return None
    url = residence.gate_photo.url
    return request.build_absolute_uri(url) if request else url


class MyResidenceSerializer(serializers.ModelSerializer):
    """For the residence's own members: their own exact location is theirs to see."""
    neighbourhood = NeighbourhoodSerializer(read_only=True)
    vouches = serializers.IntegerField(source='vouches.count', read_only=True)
    vouches_needed = serializers.SerializerMethodField()
    gate_photo_url = serializers.SerializerMethodField()
    vouchers = serializers.SerializerMethodField()

    class Meta:
        model = Residence
        fields = ['id', 'house_number', 'street', 'district', 'directions', 'lat', 'lng', 'status',
                  'verified_at', 'neighbourhood', 'vouches', 'vouches_needed', 'gate_photo_url', 'vouchers']
        read_only_fields = ['status', 'verified_at']

    def get_vouches_needed(self, obj):
        return Residence.VOUCHES_NEEDED

    def get_gate_photo_url(self, obj):
        return gate_photo_url(obj, self.context.get('request'))

    def get_vouchers(self, obj):
        # Who confirmed my own home ("Almost there", 1633:2184). Mine to see.
        return [{'name': v.voucher.full_name, 'at': v.created_at} for v in obj.vouches.select_related('voucher')]


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
    gate_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Residence
        fields = ['id', 'house_number', 'street', 'directions', 'lat', 'lng', 'household', 'gate_photo_url']

    def get_gate_photo_url(self, obj):
        return gate_photo_url(obj, self.context.get('request'))
