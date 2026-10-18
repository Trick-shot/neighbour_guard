"""Emergency contacts and the inbound-SMS SOS (docs/reference/backend.md, "To build" on SOS)."""
import uuid
from unittest import mock

from django.test import override_settings
from rest_framework.test import APITestCase

from alerts import services
from alerts.models import Alert
from core.models import EmergencyContact
from main.models import Profile
from places.tests.factories import home, user

SECRET = 'webhook-secret-for-tests'
INBOUND = f'/api/v2/sms/inbound/?key={SECRET}'


def no_celery():
    return mock.patch.multiple('alerts.tasks', send_alert=mock.DEFAULT, widen_if_no_response=mock.DEFAULT,
                               notify_emergency_contacts=mock.DEFAULT)


class EmergencyContactTests(APITestCase):
    def setUp(self):
        self.me = user('me@x.tz')
        self.other = user('other@x.tz')

    def test_contacts_are_mine_only(self):
        theirs = EmergencyContact.objects.create(user=self.other, name='Their mum', phone='+255754000222')
        self.client.force_authenticate(self.me)
        # A body naming another user changes nothing: the serializer has no `user` field.
        r = self.client.post('/api/v2/contacts/',
                             {'name': 'My mum', 'relation': 'Mother', 'phone': '0754000111',
                              'user': self.other.pk})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['phone'], '+255754000111')
        self.assertEqual(EmergencyContact.objects.get(pk=r.data['id']).user, self.me)
        self.assertEqual([c['name'] for c in self.client.get('/api/v2/contacts/').data], ['My mum'])
        # And someone else's contact is a 404, not a 403.
        self.assertEqual(self.client.patch(f'/api/v2/contacts/{theirs.pk}/', {'name': 'X'}).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/v2/contacts/{theirs.pk}/').status_code, 404)

    def test_contacts_need_a_login(self):
        self.assertEqual(self.client.get('/api/v2/contacts/').status_code, 401)
        self.assertEqual(self.client.post('/api/v2/contacts/', {'name': 'X', 'phone': '0754000111'}).status_code, 401)

    def test_five_contacts_is_the_limit(self):
        self.client.force_authenticate(self.me)
        for i in range(5):
            r = self.client.post('/api/v2/contacts/', {'name': f'P{i}', 'phone': f'07540001{i}0'})
            self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.client.post('/api/v2/contacts/', {'name': 'Six', 'phone': '0754000999'}).status_code, 400)

    def test_a_bad_number_is_refused(self):
        self.client.force_authenticate(self.me)
        self.assertEqual(self.client.post('/api/v2/contacts/', {'name': 'X', 'phone': '12345'}).status_code, 400)

    def test_contacts_are_texted_when_the_alert_goes_out_not_during_the_countdown(self):
        sender = user('s@x.tz', 'Sara')
        home(sender, house='109')
        home(user('n@x.tz'), house='110', north=100, verified=True)
        EmergencyContact.objects.create(user=sender, name='Mum', phone='+255754000111')

        with no_celery() as mocks:
            with self.captureOnCommitCallbacks(execute=True):
                alert, _ = services.create_alert(sender, client_id=uuid.uuid4(), type='robbery')
            # Still counting down: nobody's family has been frightened yet.
            mocks['notify_emergency_contacts'].delay.assert_not_called()
            with mock.patch('alerts.push.send', return_value=1):
                services.claim_and_send(alert.pk)
            mocks['notify_emergency_contacts'].delay.assert_called_once_with(alert.pk)

    def test_the_text_names_the_sender_and_the_house(self):
        from alerts.tasks import notify_emergency_contacts
        sender = user('s@x.tz', 'Sara Juma')
        home(sender, house='109', street='Masaki St')
        EmergencyContact.objects.create(user=sender, name='Mum', phone='+255754000111')
        with no_celery():
            with self.captureOnCommitCallbacks(execute=True):
                alert, _ = services.create_alert(sender, client_id=uuid.uuid4(), type='fire')
        Alert.objects.filter(pk=alert.pk).update(status=Alert.Status.SENT)

        with mock.patch('core.sms.send_sms') as send:
            notify_emergency_contacts(alert.pk)
        body, numbers = send.call_args.args
        self.assertIn('Sara Juma', body)
        self.assertIn('109 Masaki St', body)
        self.assertIn('fire', body.lower())
        self.assertEqual(numbers, ['+255754000111'])


@override_settings(SMS_INBOUND_SECRET=SECRET)
class InboundSmsTests(APITestCase):
    """The only way to raise an alert with no JWT, so every refusal here matters."""

    def setUp(self):
        self.patch = no_celery()
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.sender = user('s@x.tz', 'Sara')
        home(self.sender, house='109')
        home(user('n@x.tz'), house='110', north=100, verified=True)
        Profile.objects.update_or_create(user=self.sender,
                                         defaults={'phone_number': '+255754000111', 'is_phone_verified': True})

    def post(self, url=INBOUND, **data):
        with self.captureOnCommitCallbacks(execute=True):
            with mock.patch('alerts.push.send', return_value=1):
                return self.client.post(url, data)

    def test_a_verified_number_raises_an_alert_and_skips_the_countdown(self):
        r = self.post(**{'from': '0754000111', 'text': 'SOS fire a1b2c3d4'})
        self.assertEqual(r.status_code, 200)
        alert = Alert.objects.get(pk=r.data['alert_id'])
        self.assertEqual(alert.sender, self.sender)
        self.assertEqual(alert.type, Alert.Type.FIRE)
        self.assertEqual(alert.channel, Alert.Channel.SMS)
        self.assertEqual(alert.sms_ref, 'a1b2c3d4')
        self.assertEqual(alert.status, Alert.Status.SENT)   # sent at once, no 10 s wait

    def test_an_unknown_number_raises_nothing(self):
        r = self.post(**{'from': '0789999999', 'text': 'SOS fire'})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Alert.objects.exists())

    def test_an_unverified_number_raises_nothing(self):
        Profile.objects.filter(user=self.sender).update(is_phone_verified=False)
        r = self.post(**{'from': '0754000111', 'text': 'SOS fire'})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Alert.objects.exists())

    def test_the_wrong_key_is_refused(self):
        r = self.post('/api/v2/sms/inbound/?key=wrong', **{'from': '0754000111', 'text': 'SOS fire'})
        self.assertEqual(r.status_code, 403)
        self.assertFalse(Alert.objects.exists())

    @override_settings(SMS_INBOUND_SECRET='')
    def test_with_no_secret_configured_the_endpoint_refuses_everything(self):
        r = self.post('/api/v2/sms/inbound/', **{'from': '0754000111', 'text': 'SOS fire'})
        self.assertEqual(r.status_code, 503)
        self.assertFalse(Alert.objects.exists())

    def test_a_message_with_no_type_is_still_an_emergency(self):
        r = self.post(**{'from': '0754000111', 'text': 'please help me'})
        self.assertEqual(Alert.objects.get(pk=r.data['alert_id']).type, Alert.Type.EMERGENCY)

    def test_the_same_ref_twice_does_not_raise_two_alerts(self):
        first = self.post(**{'from': '0754000111', 'text': 'SOS fire a1b2c3d4'})
        again = self.post(**{'from': '0754000111', 'text': 'SOS fire a1b2c3d4'})
        self.assertEqual(first.data['alert_id'], again.data['alert_id'])
        self.assertEqual(Alert.objects.count(), 1)

    def test_the_app_adopts_the_sms_alert_when_data_comes_back(self):
        # The phone sent the SMS with the ref printed from its own client_id. When data returns it
        # retries over HTTP with the full id, and must find the same alert.
        client_id = uuid.uuid4()
        ref = Alert.ref_for(client_id)
        self.post(**{'from': '0754000111', 'text': f'SOS robbery {ref}'})
        self.client.force_authenticate(self.sender)
        r = self.client.post('/api/v2/alerts/', {'client_id': str(client_id), 'type': 'robbery'})
        self.assertEqual(r.status_code, 200)      # 200, not 201: nothing new was created
        self.assertEqual(Alert.objects.count(), 1)
        self.assertEqual(str(Alert.objects.get().client_id), str(client_id))

    def test_someone_elses_ref_is_not_adopted(self):
        other = user('o@x.tz')
        home(other, house='7', north=120, verified=True)
        client_id = uuid.uuid4()
        self.post(**{'from': '0754000111', 'text': f'SOS robbery {Alert.ref_for(client_id)}'})
        self.client.force_authenticate(other)
        r = self.client.post('/api/v2/alerts/', {'client_id': str(client_id), 'type': 'fire'})
        self.assertEqual(r.status_code, 201)      # their own, separate alert
        self.assertEqual(Alert.objects.count(), 2)
