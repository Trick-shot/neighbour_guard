"""v2 chat socket: ws/v2/chat/<conversation_id>/?ticket=<one-time ticket>."""
import json
import uuid

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

from . import services
from .models import Attachment, Message, Participant

User = get_user_model()

CLOSE_FORBIDDEN = 4403
MAX_BODY = 4000
# A message of one of these kinds carries a file instead of (or as well as) words.
MEDIA_KINDS = {Message.Kind.VOICE, Message.Kind.PHOTO, Message.Kind.VIDEO, Message.Kind.FILE}


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = int(self.scope['url_route']['kwargs']['conversation_id'])
        self.user = await self._user_from_ticket()
        if self.user is None or not await database_sync_to_async(services.is_participant)(self.user, self.conversation_id):
            await self.close(code=CLOSE_FORBIDDEN)
            return
        self.group = services.group_name(self.conversation_id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return
        kind = data.get('type')
        if kind == 'message':
            await self._handle_message(data)
        elif kind == 'read':
            await self._mark_read()
            await self.channel_layer.group_send(self.group, {'type': 'chat.read', 'payload': {'user_id': self.user.pk}})
        elif kind == 'typing':
            await self.channel_layer.group_send(self.group, {'type': 'chat.typing', 'payload': {'user_id': self.user.pk}})

    async def _handle_message(self, data):
        body = (data.get('body') or '').strip()[:MAX_BODY]
        kind = data.get('kind') or Message.Kind.TEXT
        attachment_id = data.get('attachment_id')
        if kind not in MEDIA_KINDS and kind != Message.Kind.TEXT:
            return
        # Text needs words; media needs a file. Neither can be empty.
        if kind == Message.Kind.TEXT and not body:
            return
        if kind in MEDIA_KINDS and not attachment_id:
            return
        try:
            client_id = uuid.UUID(str(data.get('client_id'))) if data.get('client_id') else None
        except ValueError:
            client_id = None
        message, created = await self._save(body, client_id, kind, attachment_id)
        if message is None:
            # The attachment is not this user's, is already used, or is the wrong kind.
            await self.send(text_data=json.dumps({'type': 'error', 'detail': 'That attachment cannot be used.'}))
            return
        event = await database_sync_to_async(services.message_event)(message)
        if created:
            await self.channel_layer.group_send(self.group, {'type': 'chat.message', 'payload': event})
        else:
            # A retry: tell only this phone that the message already exists.
            await self.send(text_data=json.dumps({'type': 'message', **event}))

    # --- events from the group --------------------------------------------
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type': 'message', **event['payload']}))

    async def chat_read(self, event):
        await self.send(text_data=json.dumps({'type': 'read', **event['payload']}))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({'type': 'typing', **event['payload']}))

    async def chat_alert_update(self, event):
        await self.send(text_data=json.dumps({'type': 'alert_update', **event['payload']}))

    # --- database ----------------------------------------------------------
    @database_sync_to_async
    def _user_from_ticket(self):
        params = dict(p.split('=', 1) for p in self.scope.get('query_string', b'').decode().split('&') if '=' in p)
        user_id = services.redeem_ticket(params.get('ticket', ''))
        return User.objects.filter(pk=user_id, is_active=True).first() if user_id else None

    @database_sync_to_async
    def _save(self, body, client_id, kind=Message.Kind.TEXT, attachment_id=None):
        attachment = None
        if kind in MEDIA_KINDS:
            # The attachment must be this user's own, unused, and of the kind they claim.
            attachment = Attachment.objects.filter(pk=attachment_id, uploader=self.user, kind=kind,
                                                   message__isnull=True).first()
            if attachment is None:
                return None, False
        return services.save_message(
            conversation_id=self.conversation_id, sender=self.user, kind=kind,
            body=body, client_id=client_id, attachment=attachment,
        )

    @database_sync_to_async
    def _mark_read(self):
        Participant.objects.filter(conversation_id=self.conversation_id, user=self.user).update(last_read_at=timezone.now())
