"""SOS countdown rules (docs/reference/backend.md, "SOS countdown and delivery")."""
import uuid
from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from alerts import services, tasks
from alerts.models import Alert, AlertResponse, SafetyPin
from chat.models import Message
from places.tests.factories import home, user


def no_celery():
    """Tasks are asserted, not run: tests drive the countdown by hand."""
    return mock.patch.multiple('alerts.tasks', send_alert=mock.DEFAULT, widen_if_no_response=mock.DEFAULT)


class CountdownTests(TestCase):
    def setUp(self):
        self.patch = no_celery()
        self.mocks = self.patch.start()
        self.addCleanup(self.patch.stop)
        self.sender = user('s@x.tz', 'Sara')
        self.sender_home = home(self.sender, house='109')
        self.neighbour = user('n@x.tz', 'Juma')
        home(self.neighbour, house='110', north=100, verified=True)
        self.neighbour.push_token = 'ExponentPushToken[abc]'
        self.neighbour.save()

    def create(self, **kw):
        with self.captureOnCommitCallbacks(execute=True):
            return services.create_alert(self.sender, client_id=kw.get('client_id', uuid.uuid4()),
                                         type=kw.get('type', 'robbery'))

    def test_create_starts_a_pending_countdown_and_schedules_the_send(self):
        alert, created = self.create()
        self.assertTrue(created)
        self.assertEqual(alert.status, Alert.Status.PENDING)
        self.assertAlmostEqual((alert.send_at - timezone.now()).total_seconds(), 10, delta=1)
        self.mocks['send_alert'].apply_async.assert_called_once_with(args=[alert.id], eta=alert.send_at)

    def test_retry_with_the_same_client_id_returns_the_same_alert(self):
        cid = uuid.uuid4()
        first, _ = self.create(client_id=cid)
        again, created = self.create(client_id=cid)
        self.assertFalse(created)
        self.assertEqual(first.pk, again.pk)
        self.assertEqual(Alert.objects.count(), 1)

    def test_someone_elses_client_id_is_refused(self):
        cid = uuid.uuid4()
        self.create(client_id=cid)
        with self.assertRaises(services.AlertError):
            services.create_alert(self.neighbour, client_id=cid, type='fire')

    def test_cancel_inside_the_countdown_sends_nothing(self):
        alert, _ = self.create()
        services.cancel_alert(alert, self.sender)
        with mock.patch('alerts.push.send') as push:
            self.assertFalse(services.claim_and_send(alert.pk))
            push.assert_not_called()
        self.assertEqual(Alert.objects.get(pk=alert.pk).status, Alert.Status.CANCELLED)

    def test_only_one_of_two_racing_senders_fans_out(self):
        alert, _ = self.create()
        with mock.patch('alerts.services.fan_out') as fan_out:
            results = [services.claim_and_send(alert.pk), services.claim_and_send(alert.pk)]
        self.assertEqual(sorted(results), [False, True])
        fan_out.assert_called_once()

    def test_cancel_after_send_is_refused(self):
        alert, _ = self.create()
        with mock.patch('alerts.push.send', return_value=1):
            services.claim_and_send(alert.pk)
        with self.assertRaises(services.AlertError) as e:
            services.cancel_alert(alert, self.sender)
        self.assertEqual(e.exception.code, 'conflict')

    def test_only_the_sender_can_cancel(self):
        alert, _ = self.create()
        with self.assertRaises(services.AlertError):
            services.cancel_alert(alert, self.neighbour)

    def test_send_pushes_neighbours_and_posts_the_card_in_the_group(self):
        alert, _ = self.create()
        with mock.patch('alerts.push.send', return_value=1) as push:
            services.claim_and_send(alert.pk)
        messages = push.call_args.args[0]
        self.assertEqual([m['to'] for m in messages], ['ExponentPushToken[abc]'])
        self.assertEqual(messages[0]['channelId'], 'sos')
        self.assertTrue(Message.objects.filter(kind=Message.Kind.ALERT, alert=alert).exists())
        self.assertEqual(Alert.objects.get(pk=alert.pk).notified_count, 1)

    def test_sweeper_sends_overdue_alerts(self):
        alert, _ = self.create()
        Alert.objects.filter(pk=alert.pk).update(send_at=timezone.now() - timedelta(seconds=1))
        with mock.patch('alerts.push.send', return_value=0):
            tasks.sweep_due_alerts()
        self.assertEqual(Alert.objects.get(pk=alert.pk).status, Alert.Status.SENT)

    def test_no_home_no_sos(self):
        with self.assertRaises(services.AlertError) as e:
            services.create_alert(user('homeless@x.tz'), client_id=uuid.uuid4(), type='fire')
        self.assertEqual(e.exception.code, 'no_home')

    def test_sms_channel_skips_the_countdown(self):
        with mock.patch('alerts.push.send', return_value=0), self.captureOnCommitCallbacks(execute=True):
            alert, _ = services.create_alert(self.sender, client_id=uuid.uuid4(), type='robbery', channel='sms')
        self.assertEqual(Alert.objects.get(pk=alert.pk).status, Alert.Status.SENT)


class ResponseAndResolveTests(TestCase):
    def setUp(self):
        self.patch = no_celery()
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.sender = user('s@x.tz')
        home(self.sender)
        self.neighbour = user('n@x.tz', 'Juma')
        home(self.neighbour, house='2', north=100, verified=True)
        self.stranger = user('far@x.tz')
        home(self.stranger, house='9', north=5000)
        self.alert, _ = services.create_alert(self.sender, client_id=uuid.uuid4(), type='medical')
        with mock.patch('alerts.push.send', return_value=0):
            services.claim_and_send(self.alert.pk)
        self.alert.refresh_from_db()

    def test_neighbour_can_respond_stranger_cannot(self):
        services.respond(self.alert, self.neighbour, AlertResponse.State.COMING, eta_min=2)
        self.assertEqual(self.alert.responses.get().state, 'coming')
        with self.assertRaises(services.AlertError):
            services.respond(self.alert, self.stranger, AlertResponse.State.COMING)

    def test_sender_cannot_respond_to_own_alert(self):
        with self.assertRaises(services.AlertError):
            services.respond(self.alert, self.sender, AlertResponse.State.COMING)

    def test_resolve_with_the_real_pin(self):
        pin = SafetyPin(user=self.sender)
        pin.set_pins('1234', '9999')
        pin.save()
        services.resolve(self.alert, self.sender, '1234')
        self.assertEqual(Alert.objects.get(pk=self.alert.pk).status, Alert.Status.RESOLVED)

    def test_duress_pin_keeps_the_alert_live_and_flags_it(self):
        pin = SafetyPin(user=self.sender)
        pin.set_pins('1234', '9999')
        pin.save()
        services.resolve(self.alert, self.sender, '9999')
        alert = Alert.objects.get(pk=self.alert.pk)
        self.assertEqual(alert.status, Alert.Status.SENT)
        self.assertTrue(alert.under_duress)

    def test_wrong_pin_is_refused(self):
        pin = SafetyPin(user=self.sender)
        pin.set_pins('1234', '9999')
        pin.save()
        with self.assertRaises(services.AlertError):
            services.resolve(self.alert, self.sender, '0000')

    @override_settings(SOS_WIDEN_RADIUS_M=6000)
    def test_widen_reaches_further_homes_only_once(self):
        self.stranger.push_token = 'ExponentPushToken[far]'
        self.stranger.save()
        with mock.patch('alerts.push.send', return_value=1) as push:
            self.assertTrue(services.widen_if_no_response(self.alert.pk))
            self.assertFalse(services.widen_if_no_response(self.alert.pk))
        self.assertEqual([m['to'] for m in push.call_args.args[0]], ['ExponentPushToken[far]'])


class AlertApiTests(APITestCase):
    def setUp(self):
        self.patch = no_celery()
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.sender = user('s@x.tz')
        home(self.sender)
        self.neighbour = user('n@x.tz')
        home(self.neighbour, house='2', north=100, verified=True)
        self.stranger = user('far@x.tz')
        home(self.stranger, house='9', north=5000)

    def start(self):
        self.client.force_authenticate(self.sender)
        r = self.client.post('/api/v2/alerts/', {'client_id': str(uuid.uuid4()), 'type': 'robbery'})
        self.assertEqual(r.status_code, 201)
        return r.data

    def test_countdown_flow_over_http(self):
        data = self.start()
        self.assertEqual(data['status'], 'pending')
        self.assertGreater(data['seconds_left'], 0)
        r = self.client.post(f"/api/v2/alerts/{data['id']}/cancel/")
        self.assertEqual(r.data['status'], 'cancelled')
        self.assertEqual(self.client.post(f"/api/v2/alerts/{data['id']}/send-now/").status_code, 409)

    def test_stranger_gets_404_and_neighbour_sees_the_exact_home_only_when_live(self):
        data = self.start()
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(f"/api/v2/alerts/{data['id']}/").status_code, 404)
        self.client.force_authenticate(self.neighbour)
        self.assertNotIn('lat', self.client.get(f"/api/v2/alerts/{data['id']}/").data['home'])
        with mock.patch('alerts.push.send', return_value=0):
            services.claim_and_send(data['id'])
        self.assertIn('lat', self.client.get(f"/api/v2/alerts/{data['id']}/").data['home'])

    def test_sender_view_hides_duress(self):
        data = self.start()
        with mock.patch('alerts.push.send', return_value=0):
            self.client.post(f"/api/v2/alerts/{data['id']}/send-now/")
        self.client.put('/api/v2/alerts/safety-pin/', {'pin': '1234', 'duress_pin': '9999'})
        r = self.client.post(f"/api/v2/alerts/{data['id']}/resolve/", {'pin': '9999'})
        self.assertEqual(r.data['status'], 'resolved')
        self.assertNotIn('under_duress', r.data)
        self.client.force_authenticate(self.neighbour)
        seen = self.client.get(f"/api/v2/alerts/{data['id']}/").data
        self.assertEqual(seen['status'], 'sent')
        self.assertTrue(seen['under_duress'])

    def test_push_token_must_look_like_an_expo_token(self):
        self.client.force_authenticate(self.sender)
        self.assertEqual(self.client.post('/api/v2/alerts/push-token/', {'token': 'hello'}).status_code, 400)
        self.assertEqual(self.client.post('/api/v2/alerts/push-token/', {'token': 'ExponentPushToken[x]'}).status_code, 200)

    def test_saving_a_push_token_needs_a_login(self):
        self.assertEqual(self.client.post('/api/v2/alerts/push-token/', {'token': 'ExponentPushToken[x]'}).status_code, 401)

    def test_saving_the_same_token_again_is_safe(self):
        # The Alarm check screen re-sends the token every time it runs, so this must stay idempotent.
        self.client.force_authenticate(self.sender)
        for token in ('ExponentPushToken[one]', 'ExponentPushToken[one]', 'ExponentPushToken[two]'):
            self.assertEqual(self.client.post('/api/v2/alerts/push-token/', {'token': token}).status_code, 200)
        self.sender.refresh_from_db()
        self.assertEqual(self.sender.push_token, 'ExponentPushToken[two]')


class CountdownExtrasTests(AlertApiTests):
    def test_type_can_change_only_during_the_countdown(self):
        data = self.start()
        r = self.client.post(f"/api/v2/alerts/{data['id']}/type/", {'type': 'medical'})
        self.assertEqual(r.data['type'], 'medical')
        self.assertEqual(r.data['recipients'], 1)
        with mock.patch('alerts.push.send', return_value=0):
            self.client.post(f"/api/v2/alerts/{data['id']}/send-now/")
        self.assertEqual(self.client.post(f"/api/v2/alerts/{data['id']}/type/", {'type': 'fire'}).status_code, 409)

    def test_responder_phone_is_shared_only_while_live(self):
        from main.models import Profile
        Profile.objects.filter(user=self.neighbour).update(phone_number='+255700000002', is_phone_verified=True)
        data = self.start()
        with mock.patch('alerts.push.send', return_value=0):
            self.client.post(f"/api/v2/alerts/{data['id']}/send-now/")
        self.client.force_authenticate(self.neighbour)
        self.client.post(f"/api/v2/alerts/{data['id']}/respond/", {'state': 'coming'})
        self.client.force_authenticate(self.sender)
        self.assertEqual(self.client.get(f"/api/v2/alerts/{data['id']}/").data['responses'][0]['phone'], '+255700000002')
        self.client.post(f"/api/v2/alerts/{data['id']}/resolve/")
        self.assertIsNone(self.client.get(f"/api/v2/alerts/{data['id']}/").data['responses'][0]['phone'])
