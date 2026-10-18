from rest_framework import serializers

from .models import Attachment, Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'kind', 'name', 'participants', 'last_message', 'unread', 'updated_at']

    def get_participants(self, obj):
        return [{'id': p.user_id, 'full_name': p.user.full_name} for p in obj.participants.select_related('user')]

    def get_last_message(self, obj):
        m = obj.messages.order_by('-created_at', '-id').first()
        return {'kind': m.kind, 'body': m.body[:120], 'created_at': m.created_at} if m else None

    def get_unread(self, obj):
        me = self.context['request'].user
        p = next((p for p in obj.participants.all() if p.user_id == me.id), None)
        qs = obj.messages.exclude(sender=me)
        if p and p.last_read_at:
            qs = qs.filter(created_at__gt=p.last_read_at)
        return qs.count()


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', default=None, read_only=True)
    attachment = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation_id', 'client_id', 'kind', 'body', 'sender_id', 'sender_name', 'alert_id',
                  'issue_id', 'attachment', 'created_at']

    def get_attachment(self, obj):
        # The same shape the socket sends, so the phone has one code path for both.
        from .services import attachment_event
        return attachment_event(obj)


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source='file', read_only=True)

    class Meta:
        model = Attachment
        fields = ['id', 'url', 'mime', 'size', 'duration_s']
