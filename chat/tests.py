import uuid

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APITestCase

from chat import services
from chat.models import Conversation, Message
from places.tests.factories import home, user


def socket_roundtrip(conversation_id, ticket, send=None):
    """Connect, optionally send one frame, and return (connected, first frame received or None)."""
    from backend.asgi import application

    async def run():
        comm = WebsocketCommunicator(application, f'/ws/v2/chat/{conversation_id}/?ticket={ticket}')
        connected, _ = await comm.connect()
        frame = None
        if connected and send:
            await comm.send_json_to(send)
            frame = await comm.receive_json_from(timeout=2)
        await comm.disconnect()
        return connected, frame

    return async_to_sync(run)()


class TicketTests(TestCase):
    def test_ticket_works_once(self):
        u = user('a@x.tz')
        t = services.issue_ticket(u)
        self.assertEqual(services.redeem_ticket(t), u.pk)
        self.assertIsNone(services.redeem_ticket(t))


class SocketTests(TransactionTestCase):
    def setUp(self):
        self.a, self.b, self.outsider = user('a@x.tz', 'Asha'), user('b@x.tz'), user('c@x.tz')
        self.convo = services.get_or_create_direct(self.a, self.b)

    def test_participant_can_join_and_send(self):
        connected, frame = socket_roundtrip(self.convo.id, services.issue_ticket(self.a),
                                            send={'type': 'message', 'body': 'Habari', 'client_id': str(uuid.uuid4())})
        self.assertTrue(connected)
        self.assertEqual(frame['body'], 'Habari')
        self.assertEqual(frame['sender_name'], 'Asha')

    def test_outsider_is_rejected_even_with_a_valid_ticket(self):
        connected, _ = socket_roundtrip(self.convo.id, services.issue_ticket(self.outsider))
        self.assertFalse(connected)

    def test_no_ticket_no_socket(self):
        connected, _ = socket_roundtrip(self.convo.id, 'made-up')
        self.assertFalse(connected)

    def test_retry_with_same_client_id_is_saved_once(self):
        cid = str(uuid.uuid4())
        for _ in range(2):
            socket_roundtrip(self.convo.id, services.issue_ticket(self.a),
                             send={'type': 'message', 'body': 'Once', 'client_id': cid})
        self.assertEqual(Message.objects.filter(body='Once').count(), 1)


class ChatApiTests(APITestCase):
    def test_messages_are_private_to_participants(self):
        a, b, outsider = user('a@x.tz'), user('b@x.tz'), user('c@x.tz')
        convo = services.get_or_create_direct(a, b)
        services.save_message(conversation_id=convo.id, sender=a, body='hi')
        self.client.force_authenticate(outsider)
        self.assertEqual(self.client.get(f'/api/v2/chat/conversations/{convo.id}/messages/').status_code, 404)
        self.client.force_authenticate(b)
        self.assertEqual(self.client.get(f'/api/v2/chat/conversations/{convo.id}/messages/').data[0]['body'], 'hi')

    def test_direct_conversation_is_reused(self):
        a, b = user('a@x.tz'), user('b@x.tz')
        self.client.force_authenticate(a)
        first = self.client.post('/api/v2/chat/conversations/', {'user_id': b.id}).data['id']
        again = self.client.post('/api/v2/chat/conversations/', {'user_id': b.id}).data['id']
        self.assertEqual(first, again)

    def test_neighbourhood_group_appears_in_my_list(self):
        a = user('a@x.tz')
        home(a)
        self.client.force_authenticate(a)
        kinds = [c['kind'] for c in self.client.get('/api/v2/chat/conversations/').data]
        self.assertEqual(kinds, ['group'])
