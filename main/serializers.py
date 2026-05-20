from django.db.models import Model
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Residence, Location, IssueMedia, IssueComment, Issue, Alert, Conversation, Message

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    profile_pic = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'profile_pic']

    def get_profile_pic(self, obj):
        try:
            profile = obj.profile
            if profile.profile_pic:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_pic.url)
                return profile.profile_pic.url
        except Exception:
            return None


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['email', 'user', 'profile_pic', 'phone_number']

    def update(self, instance, validated_data):
        validated_data.pop('email', None)

        instance.profile_pic = validated_data.get('profile_pic', instance.profile_pic)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.save()

        return instance


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['latitude', 'longitude']


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


class IssueMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueMedia
        fields = ['id', 'image', 'created_at']


class CommentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email']


class IssueCommentSerializer(serializers.ModelSerializer):
    user = CommentUserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = IssueComment
        fields = ['id', 'user', 'comment', 'created_at', 'likes_count', 'is_liked']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class IssueSerializer(serializers.ModelSerializer):
    media = IssueMediaSerializer(many=True, read_only=True)
    comments = IssueCommentSerializer(many=True, read_only=True)
    created_by = CommentUserSerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    # write only fields for creating location
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)
    latitude_delta = serializers.FloatField(write_only=True, required=False)
    longitude_delta = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'description', 'severity',
            'category', 'created_by', 'residence',
            'location', 'latitude', 'longitude',
            'latitude_delta', 'longitude_delta',
            'created_at', 'media', 'comments', 'uploaded_images'
        ]

    def create(self, validated_data):
        images = validated_data.pop('uploaded_images', [])
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)

        # create location if coords provided
        location = None
        if latitude and longitude:
            location = Location.objects.create(
                latitude=latitude,
                longitude=longitude,
            )

        issue = Issue.objects.create(location=location, **validated_data)

        for image in images:
            IssueMedia.objects.create(issue=issue, image=image)

        return issue


class NeighbourResidenceSerializer(serializers.ModelSerializer):
    location = LocationSerializer()
    member_count = serializers.SerializerMethodField()
    residence_members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Residence
        fields = [
            "id",
            "residence_members",
            "residence_name",
            "house_number",
            "street_name",
            "district",
            "location",
            "member_count",  # how many people live there
        ]

    def get_member_count(self, obj):
        return obj.residence_members.count()


# main/serializers.py - add these

class AlertSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    residence_name = serializers.CharField(source='residence.residence_name', read_only=True)
    house_number = serializers.IntegerField(source='residence.house_number', read_only=True)
    street_name = serializers.CharField(source='residence.street_name', read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id',
            'sender_name',
            'sender_email',
            'residence_name',
            'house_number',
            'street_name',
            'location',
            'alert_type',
            'message',
            'created_at',
            'is_resolved',
        ]

    def get_location(self, obj):
        if obj.residence.location:
            return {
                "latitude": obj.residence.location.latitude,
                "longitude": obj.residence.location.longitude,
            }
        return None


# serializers
class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_pic = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender_id', 'sender_name', 'sender_pic', 'content', 'image', 'is_read', 'created_at']

    def get_sender_pic(self, obj):
        profile = getattr(obj.sender, 'profile', None)
        if profile and profile.profile_pic:
            request = self.context.get('request')
            return request.build_absolute_uri(profile.profile_pic.url) if request else profile.profile_pic.url
        return None


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'conversation_type', 'name', 'participants', 'last_message', 'unread_count', 'created_at']

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {'content': last.content, 'created_at': str(last.created_at)}
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
