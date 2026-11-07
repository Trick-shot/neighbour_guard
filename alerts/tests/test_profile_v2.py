"""Profile v2 rules: the all-clear text, alert history, data export, delete account, map privacy."""
import uuid
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from alerts import tasks
from alerts.models import Alert, AlertResponse
from core.models import EmergencyContact
from places import services as places
from places.tests.factories import home, user


def live_alert(sender, residence, **kw):
    return Alert.objects.create(sender=sender, residence=residence, neighbourhood=residence.neighbourhood,
                                client_id=uuid.uuid4(), send_at=timezone.now(), sent_at=timezone.now(),
                                status=kw.pop('status', Alert.Status.SENT), **kw)


class AllClearTests(TestCase):
    def setUp(self):
        self.sara = user('s@x.tz', 'Sara')
        self.home = home(self.sara, house='109')
        EmergencyContact.objects.create(user=self.sara, name='Mama', phone='+255713000221')

    def test_contacts_get_an_all_clear_when_resolved(self):
        a = live_alert(self.sara, self.home, status=Alert.Status.RESOLVED)
        with mock.patch('core.sms.send_sms') as sms:
            tasks.notify_contacts_resolved(a.pk)
        sms.assert_called_once()
        self.assertIn('is safe', sms.call_args.args[0])

    def test_no_all_clear_when_switched_off(self):
        self.sara.text_contacts_on_resolve = False
        self.sara.save()
        a = live_alert(self.sara, self.home, status=Alert.Status.RESOLVED)
        with mock.patch('core.sms.send_sms') as sms:
            tasks.notify_contacts_resolved(a.pk)
        sms.assert_not_called()

    def test_no_all_clear_under_duress(self):
        # The duress PIN leaves the alert live; even if a row says resolved, duress is never all-clear.
        a = live_alert(self.sara, self.home, status=Alert.Status.RESOLVED, under_duress=True)
        with mock.patch('core.sms.send_sms') as sms:
            tasks.notify_contacts_resolved(a.pk)
        sms.assert_not_called()


class HistoryTests(APITestCase):
    def setUp(self):
        self.sara = user('s@x.tz', 'Sara')
        self.home = home(self.sara, house='109')
        self.juma = user('j@x.tz', 'Juma')
        home(self.juma, house='110', north=80)
        self.mine = live_alert(self.sara, self.home)
        AlertResponse.objects.create(alert=self.mine, responder=self.juma, state='coming')
        live_alert(self.sara, self.home, status=Alert.Status.CANCELLED)

    def test_history_counts_only_alerts_that_went_out(self):
        self.client.force_authenticate(self.sara)
        r = self.client.get('/api/v2/alerts/history/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['sent_count'], 1)
        self.assertEqual(r.data['sent'][0]['responded'], 1)
        self.assertNotIn('lat', r.data['sent'][0])

    def test_helped_lists_alerts_i_answered(self):
        self.client.force_authenticate(self.juma)
        r = self.client.get('/api/v2/alerts/history/')
        self.assertEqual(r.data['helped_count'], 1)
        self.assertEqual(r.data['sent_count'], 0)
        self.assertEqual(r.data['helped'][0]['sender_name'], 'Sara')

    def test_history_needs_login(self):
        self.assertEqual(self.client.get('/api/v2/alerts/history/').status_code, 401)


class AccountTests(APITestCase):
    def setUp(self):
        self.sara = user('s@x.tz', 'Sara')
        self.home = home(self.sara, house='109')
        EmergencyContact.objects.create(user=self.sara, name='Mama', phone='+255713000221')
        self.client.force_authenticate(self.sara)

    def test_export_is_my_own_data(self):
        other = user('o@x.tz', 'Other')
        EmergencyContact.objects.create(user=other, name='Not mine', phone='+255700000000')
        r = self.client.get('/api/auth/users/me/export/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([c['name'] for c in r.data['emergency_contacts']], ['Mama'])
        self.assertEqual(r.data['home']['house_number'], '109')

    def test_delete_needs_the_word(self):
        r = self.client.post('/api/auth/users/me/delete/', {'confirm': 'yes'})
        self.assertEqual(r.status_code, 400)
        self.sara.refresh_from_db()
        self.assertTrue(self.sara.is_active)

    def test_delete_switches_off_and_wipes(self):
        r = self.client.post('/api/auth/users/me/delete/', {'confirm': 'DELETE'})
        self.assertEqual(r.status_code, 204)
        self.sara.refresh_from_db()
        self.assertFalse(self.sara.is_active)
        self.assertEqual(self.sara.full_name, 'Former neighbour')
        self.assertFalse(EmergencyContact.objects.filter(user=self.sara).exists())
        self.assertIsNone(places.residence_of(self.sara))

    def test_turn_off_all_clear(self):
        r = self.client.patch('/api/auth/users/me/', {'text_contacts_on_resolve': False})
        self.assertEqual(r.status_code, 200)
        self.sara.refresh_from_db()
        self.assertFalse(self.sara.text_contacts_on_resolve)


class MapPrivacyTests(APITestCase):
    def test_nobody_hides_my_home_from_the_area_counts(self):
        sara = user('s@x.tz', 'Sara')
        h = home(sara, house='109')
        before = sum(a['homes'] for a in places.areas_for(h.neighbourhood))
        self.client.force_authenticate(sara)
        r = self.client.patch('/api/v2/places/me/', {'map_visibility': 'nobody'})
        self.assertEqual(r.status_code, 200)
        after = sum(a['homes'] for a in places.areas_for(h.neighbourhood))
        self.assertEqual(after, before - 1)

    def test_moving_the_pin_is_still_refused(self):
        sara = user('s@x.tz', 'Sara')
        h = home(sara, house='109')
        self.client.force_authenticate(sara)
        self.client.patch('/api/v2/places/me/', {'lat': 0, 'lng': 0, 'map_visibility': 'nobody'})
        h.refresh_from_db()
        self.assertNotEqual(h.lat, 0)


class RoutinePushTests(TestCase):
    def test_quiet_hours_across_midnight(self):
        from datetime import datetime, time
        u = user('q@x.tz', 'Q')
        u.quiet_from, u.quiet_to = time(22, 0), time(6, 0)
        self.assertFalse(u.wants_routine_push(datetime(2026, 1, 1, 23, 30)))
        self.assertFalse(u.wants_routine_push(datetime(2026, 1, 1, 5, 59)))
        self.assertTrue(u.wants_routine_push(datetime(2026, 1, 1, 6, 0)))
        self.assertTrue(u.wants_routine_push(datetime(2026, 1, 1, 14, 0)))

    def test_switched_off_means_no_issue_push(self):
        from issues.models import Issue, IssueFollow
        from issues import tasks as issue_tasks
        reporter = user('r@x.tz', 'R')
        h = home(reporter, house='1')
        follower = user('f@x.tz', 'F')
        follower.push_token, follower.routine_push = 'ExponentPushToken[f]', False
        follower.save()
        issue = Issue.objects.create(neighbourhood=h.neighbourhood, created_by=reporter, title='Bin')
        IssueFollow.objects.create(issue=issue, user=follower)
        with mock.patch('alerts.push.send') as send:
            issue_tasks.notify_followers(issue.pk, 'resolved')
        send.assert_not_called()


class DemoFixesTests(APITestCase):
    """Test report 2026-11-06: F-005 (seen demotes a responder) and F-007 + chat card (duress leaks)."""

    def setUp(self):
        self.sara = user('s@x.tz', 'Sara')
        self.home = home(self.sara, house='109')
        self.juma = user('j@x.tz', 'Juma')
        home(self.juma, house='110', north=80)
        self.alert = live_alert(self.sara, self.home)

    def test_seen_never_undoes_coming(self):
        from alerts import services
        services.respond(self.alert, self.juma, 'coming')
        services.respond(self.alert, self.juma, 'seen')
        self.assertEqual(AlertResponse.objects.get(alert=self.alert, responder=self.juma).state, 'coming')
        services.respond(self.alert, self.juma, 'arrived')
        services.respond(self.alert, self.juma, 'seen')
        self.assertEqual(AlertResponse.objects.get(alert=self.alert, responder=self.juma).state, 'arrived')

    def test_history_shows_my_duress_alert_as_resolved(self):
        Alert.objects.filter(pk=self.alert.pk).update(under_duress=True)
        self.client.force_authenticate(self.sara)
        row = self.client.get('/api/v2/alerts/history/').data['sent'][0]
        self.assertEqual(row['status'], 'resolved')
        self.assertIsNotNone(row['resolved_at'])

    def test_chat_card_is_masked_for_the_sender_only(self):
        from alerts.services import alert_summary, summary_for
        Alert.objects.filter(pk=self.alert.pk).update(under_duress=True)
        self.alert.refresh_from_db()
        s = alert_summary(self.alert)
        mine = summary_for(s, self.sara.pk)
        theirs = summary_for(s, self.juma.pk)
        self.assertEqual(mine['status'], 'resolved')
        self.assertFalse(mine['under_duress'])
        self.assertEqual(theirs['status'], 'sent')
        self.assertTrue(theirs['under_duress'])
