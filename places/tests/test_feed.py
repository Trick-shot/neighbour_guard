from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from alerts.models import Alert

from .factories import home, user


def sent_alert(sender_home, sender, minutes_ago=30, resolved=True):
    now = timezone.now()
    return Alert.objects.create(sender=sender, residence=sender_home, neighbourhood=sender_home.neighbourhood,
                                send_at=now - timedelta(minutes=minutes_ago), sent_at=now - timedelta(minutes=minutes_ago),
                                status=Alert.Status.RESOLVED if resolved else Alert.Status.SENT,
                                resolved_at=now - timedelta(minutes=minutes_ago - 6) if resolved else None)


class FeedTests(APITestCase):
    def setUp(self):
        self.me = user('me@x.tz', 'Erick Luoga')
        self.my_home = home(self.me, house='109', verified=True)
        self.juma = user('juma@x.tz', 'Juma Hassan')
        self.juma_home = home(self.juma, house='110', north=80, verified=True)
        self.client.force_authenticate(self.me)

    def feed(self, **params):
        return self.client.get('/api/v2/notifications/', params).data

    def test_a_neighbours_alert_is_named_by_house_for_a_verified_member(self):
        sent_alert(self.juma_home, self.juma)
        titles = [i['title'] for i in self.feed()['items']]
        self.assertIn('Emergency at House 110', titles)

    def test_an_unverified_member_sees_the_street_not_the_house(self):
        newcomer = user('new@x.tz')
        home(newcomer, house='111', north=40, verified=False)
        sent_alert(self.juma_home, self.juma)
        self.client.force_authenticate(newcomer)
        titles = [i['title'] for i in self.feed()['items']]
        self.assertIn('Emergency at Masaki St', titles)
        self.assertFalse(any('110' in t for t in titles))

    def test_my_own_alert_is_never_in_my_feed(self):
        # A duress alert must keep looking resolved to its sender, so the feed leaves it out.
        sent_alert(self.my_home, self.me, resolved=False)
        self.assertFalse(any(i['kind'] == 'alert' for i in self.feed()['items']))

    def test_vouch_requests_go_to_verified_members_only(self):
        newcomer = user('ritha@x.tz', 'Ritha Komba')
        home(newcomer, house='112', north=60, verified=False)
        self.assertIn('Ritha Komba asked you to vouch', [i['title'] for i in self.feed()['items']])
        other = user('other@x.tz')
        home(other, house='113', north=20, verified=False)
        self.client.force_authenticate(other)
        self.assertFalse(any(i['kind'] == 'vouch' for i in self.feed()['items']))

    def test_seen_clears_the_unread_count(self):
        sent_alert(self.juma_home, self.juma)
        self.assertGreater(self.feed()['unread'], 0)
        self.assertEqual(self.client.post('/api/v2/notifications/seen/').status_code, 204)
        self.assertEqual(self.feed()['unread'], 0)

    def test_alerts_only_filter(self):
        sent_alert(self.juma_home, self.juma)
        kinds = {i['kind'] for i in self.feed(kind='alerts')['items']}
        self.assertEqual(kinds, {'alert'})

    def test_signed_out_is_refused(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/v2/notifications/').status_code, 401)
