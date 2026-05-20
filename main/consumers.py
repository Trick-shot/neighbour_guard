import json
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = await self.get_user_from_token()

        if not self.user:
            print("WebSocket auth failed - no user found")
            await self.close()
            return

        await self.set_online_status(True)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"WebSocket connected: user={self.user.id}")

        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'user_status',
            'user_id': self.user.id,
            'is_online': True
        })

    async def disconnect(self, close_code):
        await self.set_online_status(False)
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'user_status',
            'user_id': self.user.id,
            'is_online': False
        })
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')

        if message_type == 'message':
            message = await self.save_message(data.get('content'))
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'chat_message',
                'message_id': message.id,
                'content': message.content,
                'sender_id': self.user.id,
                'sender_name': self.user.full_name,
                'created_at': str(message.created_at),
            })

        elif message_type == 'read':
            await self.mark_messages_read()
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'messages_read',
                'user_id': self.user.id,
            })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message_id': event['message_id'],
            'content': event['content'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'created_at': event['created_at'],
        }))

    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'status',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
        }))

    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read',
            'user_id': event['user_id'],
        }))

    @database_sync_to_async
    def save_message(self, content):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content
        )

    @database_sync_to_async
    def mark_messages_read(self):
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False
        ).exclude(sender=self.user).update(is_read=True)

    @database_sync_to_async
    def set_online_status(self, status):
        User.objects.filter(id=self.user.id).update(is_online=status)

    @database_sync_to_async
    def get_user_from_token(self):
        try:
            query_string = self.scope.get('query_string', b'').decode()
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]
            if not token:
                print("No token in query params")
                return None
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception as e:
            print(f"Token auth error: {e}")
            return None
