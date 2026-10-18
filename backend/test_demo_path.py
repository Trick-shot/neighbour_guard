"""The 24 Oct demo, walked end to end over HTTP.

Every other test checks one rule inside one app. This one follows the exact sequence the two
phones make on stage, across `core` → `places` → `alerts` → `chat`, using real JWTs in the
Authorization header rather than `force_authenticate`. If the apps ever stop fitting together,
this fails before a rehearsal does.

The only thing mocked is the HTTP call to Expo's push service, and it is mocked at that boundary on
purpose: the real payload is built and asserted, because `channelId: "sos"` and the alarm sound are
the contract the phone's notification channel depends on.
"""
import re
import uuid
from unittest import mock

from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

from alerts.models import Alert
from main.models import Profile
from places.tests.factories import offset, user

CODE = re.compile(r'\b(\d{6})\b')


def expo_accepts_everything(messages):
    """Stand in for Expo: accept every message in the chunk."""
    response = mock.Mock(status_code=200)
    response.json.return_value = {'data': [{'status': 'ok'} for _ in messages]}
    response.raise_for_status.return_value = None
    return response


class DemoPathTests(APITestCase):
    """Sign in → pin homes → SOS → neighbour responds → alert card in the group → resolved."""

    def setUp(self):
        cache.clear()
        # Accounts exist (the demo seeds them with `manage.py seed_demo`); nothing else does.
        self.sender = user('you@test.tz', 'Erick Luoga')
        self.neighbour = user('juma@test.tz', 'Juma Hassan')
        self.far = user('far@test.tz', 'Far Away')
        # Juma has a verified phone, so the sender can tap to call him during the alert.
        Profile.objects.update_or_create(user=self.neighbour,
                                         defaults={'phone_number': '+255754000111', 'is_phone_verified': True})

    # --- helpers ----------------------------------------------------------------------------
    def sign_in(self, email):
        """The real sign-in: ask for a code, read the email, exchange it for tokens."""
        mail.outbox.clear()
        self.assertEqual(self.client.post('/api/auth/email-code/', {'email': email}).status_code, 200)
        self.assertEqual(len(mail.outbox), 1, 'no sign-in email was sent')
        code = CODE.search(mail.outbox[0].body).group(1)
        r = self.client.post('/api/auth/email-code/verify/', {'email': email, 'code': code})
        self.assertEqual(r.status_code, 200, r.data)
        return r.data['access']

    def as_phone(self, access):
        """Every later request carries the JWT, exactly as the app does."""
        self.client.credentials(HTTP_AUTHORIZATION=f'JWT {access}')

    def pin_home(self, house, north):
        lat, lng = offset(meters_north=north)
        r = self.client.post('/api/v2/places/me/', {
            'house_number': house, 'street': 'Masaki St', 'district': 'Masaki', 'lat': lat, 'lng': lng,
            'directions': 'Black gate next to the shop',
        })
        self.assertEqual(r.status_code, 201, r.data)
        return r.data

    # --- the demo ---------------------------------------------------------------------------
    def test_the_whole_demo_path(self):
        # 1. Both phones sign in with an emailed code.
        sender_token = self.sign_in('you@test.tz')
        neighbour_token = self.sign_in('juma@test.tz')
        self.assertNotEqual(sender_token, neighbour_token)

        # 2. Both pin their homes, 100 m apart, which puts them in one neighbourhood.
        self.as_phone(sender_token)
        sender_home = self.pin_home('109', 0)
        self.as_phone(neighbour_token)
        neighbour_home = self.pin_home('110', 100)
        self.assertEqual(sender_home['neighbourhood']['id'], neighbour_home['neighbourhood']['id'])

        # 3. The neighbour's phone registers for pushes. Without this it cannot ring.
        self.assertEqual(
            self.client.post('/api/v2/alerts/push-token/', {'token': 'ExponentPushToken[juma]'}).status_code, 200)

        # Someone 5 km away is in another neighbourhood and must stay out of all of this.
        self.as_phone(self.sign_in('far@test.tz'))
        far_lat, far_lng = offset(meters_north=5000)
        self.client.post('/api/v2/places/me/',
                         {'house_number': '9', 'street': 'Far St', 'lat': far_lat, 'lng': far_lng})
        self.client.post('/api/v2/alerts/push-token/', {'token': 'ExponentPushToken[far]'})

        # 4. The sender's Home map: approximate areas only, and nothing happening yet.
        self.as_phone(sender_token)
        areas = self.client.get('/api/v2/places/areas/').data
        self.assertEqual(sum(a['homes'] for a in areas['areas']), 2)
        self.assertEqual(self.client.get('/api/v2/alerts/').data, [])

        # 5. Hold the SOS: the alert is created at the START of the countdown, so a snatched phone
        #    still gets it out.
        client_id = str(uuid.uuid4())
        with self.captureOnCommitCallbacks(execute=True):
            r = self.client.post('/api/v2/alerts/', {'client_id': client_id, 'type': 'robbery'})
        self.assertEqual(r.status_code, 201, r.data)
        alert = r.data
        self.assertEqual(alert['status'], 'pending')
        self.assertGreater(alert['seconds_left'], 0)
        self.assertEqual(alert['recipients'], 1, 'the countdown should say it reaches Juma, and only Juma')

        # 6. A flaky connection makes the phone retry with the same client_id: same alert, not two.
        again = self.client.post('/api/v2/alerts/', {'client_id': client_id, 'type': 'robbery'})
        self.assertEqual(again.data['id'], alert['id'])
        self.assertEqual(Alert.objects.count(), 1)

        # 7. Still in the countdown, the sender slides to a different type.
        changed = self.client.post(f"/api/v2/alerts/{alert['id']}/type/", {'type': 'fire'})
        self.assertEqual(changed.data['type'], 'fire')

        # 8. "Send now". The push must reach Juma on the sos channel with the alarm sound.
        with mock.patch('alerts.push.requests.post') as post:
            post.side_effect = lambda url, json, **kw: expo_accepts_everything(json)
            with self.captureOnCommitCallbacks(execute=True):
                sent = self.client.post(f"/api/v2/alerts/{alert['id']}/send-now/")
        self.assertEqual(sent.data['status'], 'sent')

        pushed = [m for call in post.call_args_list for m in call.kwargs['json']]
        self.assertEqual([m['to'] for m in pushed], ['ExponentPushToken[juma]'],
                         'the alarm went to the wrong phones')
        self.assertEqual(pushed[0]['channelId'], 'sos')
        self.assertEqual(pushed[0]['sound'], 'alarm.mp3')
        self.assertEqual(pushed[0]['data']['kind'], 'sos')
        self.assertEqual(pushed[0]['data']['alert_id'], alert['id'])

        # 9. Juma's phone opens the alarm: now, and only now, he gets the exact address.
        self.as_phone(neighbour_token)
        seen = self.client.get(f"/api/v2/alerts/{alert['id']}/").data
        self.assertEqual(seen['home']['house_number'], '109')
        self.assertIsNotNone(seen['home']['lat'])
        self.assertEqual(seen['home']['directions'], 'Black gate next to the shop')

        # 10. "I'm coming."
        coming = self.client.post(f"/api/v2/alerts/{alert['id']}/respond/", {'state': 'coming', 'eta_min': 3})
        self.assertEqual(coming.status_code, 200, coming.data)

        # 11. The sender sees him, with a number to call.
        self.as_phone(sender_token)
        live = self.client.get(f"/api/v2/alerts/{alert['id']}/").data
        self.assertEqual([x['state'] for x in live['responses']], ['coming'])
        self.assertEqual(live['responses'][0]['name'], 'Juma Hassan')
        self.assertEqual(live['responses'][0]['eta_min'], 3)
        self.assertEqual(live['responses'][0]['phone'], '+255754000111')
        self.assertNotIn('under_duress', live)

        # 12. The live card is in the neighbourhood group chat, which both joined by pinning a home.
        self.as_phone(neighbour_token)
        groups = [c for c in self.client.get('/api/v2/chat/conversations/').data if c['kind'] == 'group']
        self.assertEqual(len(groups), 1)
        messages = self.client.get(f"/api/v2/chat/conversations/{groups[0]['id']}/messages/").data
        cards = [m for m in messages if m['kind'] == 'alert']
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0]['alert_id'], alert['id'])
        # And the socket the chat screen opens needs a one-time ticket.
        self.assertEqual(self.client.post('/api/v2/chat/ticket/').status_code, 200)

        # 13. The stranger 5 km away never saw any of it.
        self.as_phone(self.sign_in('far@test.tz'))
        self.assertEqual(self.client.get('/api/v2/alerts/').data, [])
        self.assertEqual(self.client.get(f"/api/v2/alerts/{alert['id']}/").status_code, 404)

        # 14. "I'm safe", with the real safety PIN.
        self.as_phone(sender_token)
        self.assertEqual(self.client.put('/api/v2/alerts/safety-pin/',
                                         {'pin': '1234', 'duress_pin': '9999'}).status_code, 200)
        resolved = self.client.post(f"/api/v2/alerts/{alert['id']}/resolve/", {'pin': '1234'})
        self.assertEqual(resolved.data['status'], 'resolved')
        self.assertNotIn('under_duress', resolved.data)
        self.assertEqual(Alert.objects.get(pk=alert['id']).status, Alert.Status.RESOLVED)
