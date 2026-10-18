"""Security tests for the v1 API (holes 1-4 in docs/reference/backend.md)."""
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from main.models import Conversation, Issue, Profile, Residence

User = get_user_model()


def make_user(email, name='Test'):
    return User.objects.create_user(email=email, password='pw-12345!', full_name=name)


class ResidenceSecurityTests(APITestCase):
    def test_create_requires_login(self):
        r = self.client.post('/api/main/residences/', {'house_number': 1, 'email': 'x@x.tz'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_create_uses_the_logged_in_user_not_an_email(self):
        me, victim = make_user('me@x.tz'), make_user('victim@x.tz')
        self.client.force_authenticate(me)
        r = self.client.post('/api/main/residences/', {'house_number': 5, 'email': 'victim@x.tz'}, format='json')
        self.assertEqual(r.status_code, 201)
        residence = Residence.objects.get()
        self.assertEqual(list(residence.residence_members.all()), [me])
        self.assertFalse(victim.residences.exists())

    def test_cannot_update_someone_elses_residence(self):
        owner, attacker = make_user('o@x.tz'), make_user('a@x.tz')
        residence = Residence.objects.create(house_number=9)
        residence.residence_members.add(owner)
        self.client.force_authenticate(attacker)
        r = self.client.patch(f'/api/main/residences/{residence.id}/', {'house_number': 1}, format='json')
        self.assertEqual(r.status_code, 404)
        self.client.force_authenticate(None)
        r = self.client.patch(f'/api/main/residences/{residence.id}/', {'house_number': 1}, format='json')
        self.assertEqual(r.status_code, 401)


class ProfileSecurityTests(APITestCase):
    def test_update_profile_requires_login(self):
        make_user('v@x.tz')
        r = self.client.patch('/api/main/profiles/update-profile/', {'email': 'v@x.tz', 'phone_number': '+1'})
        self.assertEqual(r.status_code, 401)

    def test_update_profile_changes_only_my_profile_and_never_the_phone(self):
        me, victim = make_user('me@x.tz'), make_user('v@x.tz')
        Profile.objects.filter(user=victim).update(phone_number='+255700000001')
        self.client.force_authenticate(me)
        r = self.client.patch('/api/main/profiles/update-profile/', {'email': 'v@x.tz', 'phone_number': '+999'},
                              format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Profile.objects.get(user=victim).phone_number, '+255700000001')
        self.assertEqual(Profile.objects.get(user=me).phone_number, '')

    def test_profile_list_is_not_exposed(self):
        me = make_user('me@x.tz')
        make_user('other@x.tz')
        self.client.force_authenticate(me)
        r = self.client.get('/api/main/profiles/')
        self.assertNotIn(b'other@x.tz', r.content)


class IssueSecurityTests(APITestCase):
    def test_only_the_reporter_can_delete(self):
        owner, other = make_user('o@x.tz'), make_user('x@x.tz')
        issue = Issue.objects.create(title='Bins', description='Full', created_by=owner)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.delete(f'/api/main/issues/{issue.id}/').status_code, 403)
        self.client.force_authenticate(owner)
        self.assertEqual(self.client.delete(f'/api/main/issues/{issue.id}/').status_code, 204)


class V1ChatSocketTests(TransactionTestCase):
    async def _connect(self, user, conversation_id):
        from backend.asgi import application
        token = await self._token(user)
        comm = WebsocketCommunicator(application, f'/ws/chat/{conversation_id}/?token={token}')
        connected, _ = await comm.connect()
        await comm.disconnect()
        return connected

    @staticmethod
    async def _token(user):
        return str(AccessToken.for_user(user))

    def test_non_participant_cannot_join(self):
        from asgiref.sync import async_to_sync
        a, b, outsider = make_user('a@x.tz'), make_user('b@x.tz'), make_user('c@x.tz')
        convo = Conversation.objects.create(conversation_type='direct')
        convo.participants.add(a, b)
        self.assertTrue(async_to_sync(self._connect)(a, convo.id))
        self.assertFalse(async_to_sync(self._connect)(outsider, convo.id))
