from rest_framework import serializers

from places.serializers import ResidenceNeighbourSerializer, ResidenceResponderSerializer

from .models import Alert, AlertResponse


class AlertCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=Alert.Type.choices)
    message = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')


class RespondSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=AlertResponse.State.choices)
    eta_min = serializers.IntegerField(min_value=0, max_value=120, required=False, allow_null=True)


class ResolveSerializer(serializers.Serializer):
    pin = serializers.CharField(max_length=12, required=False, allow_blank=True)


class SafetyPinSerializer(serializers.Serializer):
    pin = serializers.RegexField(r'^\d{4,8}$')
    duress_pin = serializers.RegexField(r'^\d{4,8}$')

    def validate(self, attrs):
        if attrs['pin'] == attrs['duress_pin']:
            raise serializers.ValidationError('The duress PIN must be different from your PIN.')
        return attrs


class ResponseSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='responder.full_name', read_only=True)

    class Meta:
        model = AlertResponse
        fields = ['responder_id', 'name', 'state', 'eta_min', 'updated_at']


class AlertSerializer(serializers.ModelSerializer):
    """The exact home appears only while the alert is live, and only for the sender and its responders.

    Views pass context['can_see_exact'] after checking that rule; a response for a
    sender in duress looks exactly like a resolved one (see AlertSenderSerializer).
    """
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    home = serializers.SerializerMethodField()
    sender_phone = serializers.SerializerMethodField()
    responses = ResponseSerializer(many=True, read_only=True)
    seconds_left = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = ['id', 'client_id', 'type', 'message', 'status', 'channel', 'sender_id', 'sender_name',
                  'sender_phone', 'home', 'send_at', 'sent_at', 'resolved_at', 'seconds_left', 'radius_m',
                  'notified_count', 'under_duress', 'responses', 'created_at']

    def _exact(self, obj):
        return obj.is_live and self.context.get('can_see_exact', False)

    def get_home(self, obj):
        if self._exact(obj):
            return ResidenceResponderSerializer(obj.residence).data
        return ResidenceNeighbourSerializer(obj.residence).data

    def get_sender_phone(self, obj):
        if not self._exact(obj):
            return None
        profile = getattr(obj.sender, 'profile', None)
        return profile.phone_number if profile and profile.is_phone_verified else None

    def get_seconds_left(self, obj):
        if obj.status != Alert.Status.PENDING:
            return 0
        from django.utils import timezone
        return max(0, int((obj.send_at - timezone.now()).total_seconds()))


class AlertSenderSerializer(AlertSerializer):
    """What the sender's own phone sees. Hides the duress flag and shows 'resolved' under duress."""

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data.pop('under_duress', None)
        if obj.under_duress:
            data['status'] = Alert.Status.RESOLVED
            data['resolved_at'] = data.get('resolved_at') or obj.sent_at
        return data
