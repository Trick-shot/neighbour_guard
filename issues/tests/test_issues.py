"""The Issues visibility matrix from docs/reference/backend.md, proved from the forbidden side."""
from unittest import mock

from rest_framework.test import APITestCase

from chat.models import Message
from issues.models import Issue, IssueComment
from places.tests.factories import home, offset, user


def no_push():
    return mock.patch('issues.tasks.notify_followers')


class IssuesApiTests(APITestCase):
    """Two neighbourhoods 3 km apart, so each is outside the other's 500 m circle but within 5 km."""

    def setUp(self):
        self.resident = user('resident@x.tz', 'Asha')
        self.resident_home = home(self.resident, house='109')                       # founds area A, verified
        self.neighbour = user('neighbour@x.tz', 'Juma')
        home(self.neighbour, house='110', north=100, verified=True)                 # verified in A
        self.unverified = user('new@x.tz', 'New')
        home(self.unverified, house='111', north=120)                               # in A, pending
        self.outsider = user('outsider@x.tz', 'Far')
        home(self.outsider, house='7', north=3000)                                  # founds area B, verified

        self.private = Issue.objects.create(
            neighbourhood=self.resident_home.neighbourhood, created_by=self.resident,
            title='Dark alley behind the shop', visibility=Issue.Visibility.NEIGHBOURHOOD)
        self.public = Issue.objects.create(
            neighbourhood=self.resident_home.neighbourhood, created_by=self.resident,
            title='Burst water main on Masaki St', visibility=Issue.Visibility.PUBLIC)

    # --- seeing -------------------------------------------------------------
    def test_a_verified_resident_sees_both_of_their_areas_issues(self):
        self.client.force_authenticate(self.neighbour)
        titles = {i['title'] for i in self.client.get('/api/v2/issues/').data}
        self.assertEqual(titles, {self.private.title, self.public.title})

    def test_someone_from_another_area_sees_only_the_public_one(self):
        self.client.force_authenticate(self.outsider)
        r = self.client.get('/api/v2/issues/?scope=others')
        self.assertEqual([i['title'] for i in r.data], [self.public.title])
        # And the private one is a 404, not a 403: they may not know it exists.
        self.assertEqual(self.client.get(f'/api/v2/issues/{self.private.pk}/').status_code, 404)

    def test_the_queryset_itself_excludes_what_cannot_be_seen(self):
        # Not just the detail view: a list must never contain it either.
        self.client.force_authenticate(self.outsider)
        for url in ('/api/v2/issues/', '/api/v2/issues/?scope=mine', '/api/v2/issues/?scope=others'):
            ids = {i['id'] for i in self.client.get(url).data}
            self.assertNotIn(self.private.pk, ids, url)

    def test_an_unverified_member_sees_their_areas_issues_without_the_reporters_name(self):
        self.client.force_authenticate(self.unverified)
        issues = self.client.get('/api/v2/issues/').data
        self.assertEqual({i['title'] for i in issues}, {self.private.title, self.public.title})
        self.assertEqual({i['reporter_name'] for i in issues}, {None})

    def test_issues_need_a_login(self):
        self.assertEqual(self.client.get('/api/v2/issues/').status_code, 401)
        self.assertEqual(self.client.post('/api/v2/issues/', {'title': 'x'}).status_code, 401)

    # --- reporting ----------------------------------------------------------
    def test_the_neighbourhood_comes_from_my_home_not_the_body(self):
        self.client.force_authenticate(self.neighbour)
        other_area = self.outsider.residence_membership.residence.neighbourhood
        r = self.client.post('/api/v2/issues/', {
            'title': 'Street light out', 'description': 'Dark since Friday', 'category': 'lighting',
            'neighbourhood': other_area.pk, 'created_by': self.outsider.pk,
        })
        self.assertEqual(r.status_code, 201, r.data)
        issue = Issue.objects.get(pk=r.data['id'])
        self.assertEqual(issue.neighbourhood, self.resident_home.neighbourhood)
        self.assertEqual(issue.created_by, self.neighbour)

    def test_reporting_needs_a_home(self):
        homeless = user('nohome@x.tz')
        self.client.force_authenticate(homeless)
        self.assertEqual(self.client.post('/api/v2/issues/', {'title': 'x'}).status_code, 403)

    # --- supporting and following ------------------------------------------
    def test_an_unverified_member_cannot_support_or_follow(self):
        self.client.force_authenticate(self.unverified)
        self.assertEqual(self.client.post(f'/api/v2/issues/{self.private.pk}/support/').status_code, 403)
        self.assertEqual(self.client.post(f'/api/v2/issues/{self.private.pk}/follow/').status_code, 403)
        self.assertEqual(self.private.supports.count(), 0)

    def test_someone_from_another_area_can_support_a_public_issue(self):
        self.client.force_authenticate(self.outsider)
        r = self.client.post(f'/api/v2/issues/{self.public.pk}/support/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['support_count'], 1)
        # Supporting twice is still one voice.
        self.client.post(f'/api/v2/issues/{self.public.pk}/support/')
        self.assertEqual(self.public.supports.count(), 1)

    def test_supporting_an_issue_i_cannot_see_is_a_404(self):
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.post(f'/api/v2/issues/{self.private.pk}/support/').status_code, 404)

    # --- commenting ---------------------------------------------------------
    def test_only_a_verified_resident_of_the_area_can_comment(self):
        self.client.force_authenticate(self.neighbour)
        self.assertEqual(
            self.client.post(f'/api/v2/issues/{self.private.pk}/comments/', {'body': 'Same here'}).status_code, 201)

        # Verified, but in another area, on a public issue: may read, may not comment.
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get(f'/api/v2/issues/{self.public.pk}/comments/').status_code, 200)
        self.assertEqual(
            self.client.post(f'/api/v2/issues/{self.public.pk}/comments/', {'body': 'Me too'}).status_code, 403)

        # In the area but unverified: may not comment either.
        self.client.force_authenticate(self.unverified)
        self.assertEqual(
            self.client.post(f'/api/v2/issues/{self.private.pk}/comments/', {'body': 'Hello'}).status_code, 403)

        self.assertEqual(IssueComment.objects.count(), 1)

    # --- status and followers ----------------------------------------------
    def test_only_the_reporter_moves_an_issue_along_and_followers_are_told_once(self):
        self.client.force_authenticate(self.neighbour)
        self.client.post(f'/api/v2/issues/{self.private.pk}/follow/')
        self.assertEqual(
            self.client.patch(f'/api/v2/issues/{self.private.pk}/', {'status': 'resolved'}).status_code, 403)

        self.client.force_authenticate(self.resident)
        with no_push() as notify:
            r = self.client.patch(f'/api/v2/issues/{self.private.pk}/', {'status': 'in_progress'})
            self.assertEqual(r.data['status'], 'in_progress')
            notify.delay.assert_called_once_with(self.private.pk, 'in_progress')
            # Setting the same status again notifies nobody a second time.
            self.client.patch(f'/api/v2/issues/{self.private.pk}/', {'status': 'in_progress'})
            self.assertEqual(notify.delay.call_count, 1)

    def test_nothing_but_the_status_can_be_patched(self):
        self.client.force_authenticate(self.resident)
        r = self.client.patch(f'/api/v2/issues/{self.private.pk}/', {'title': 'Rewritten'})
        self.assertEqual(r.status_code, 400)
        self.private.refresh_from_db()
        self.assertEqual(self.private.title, 'Dark alley behind the shop')

    # --- sharing ------------------------------------------------------------
    def test_sharing_puts_a_card_in_the_group_and_only_residents_may(self):
        self.client.force_authenticate(self.neighbour)
        r = self.client.post(f'/api/v2/issues/{self.private.pk}/share/')
        self.assertEqual(r.status_code, 201, r.data)
        card = Message.objects.get(pk=r.data['message_id'])
        self.assertEqual(card.kind, Message.Kind.ISSUE)
        self.assertEqual(card.issue_id, self.private.pk)
        self.assertEqual(card.conversation.neighbourhood, self.resident_home.neighbourhood)

        # Someone from another area cannot push a public issue into this group.
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.post(f'/api/v2/issues/{self.public.pk}/share/').status_code, 403)

    # --- scope --------------------------------------------------------------
    def test_others_scope_is_nearest_first_and_stops_at_five_kilometres(self):
        far_user = user('vfar@x.tz')
        far_home = home(far_user, house='1', north=50_000)        # 50 km away: too far to matter
        Issue.objects.create(neighbourhood=far_home.neighbourhood, created_by=far_user,
                             title='Too far to matter', visibility=Issue.Visibility.PUBLIC)
        middle_user = user('mid@x.tz')
        middle_home = home(middle_user, house='1', north=4000)    # 4 km: inside the 5 km reach
        Issue.objects.create(neighbourhood=middle_home.neighbourhood, created_by=middle_user,
                             title='Four kilometres away', visibility=Issue.Visibility.PUBLIC)

        self.client.force_authenticate(self.outsider)             # 3 km from A, 1 km from the middle
        titles = [i['title'] for i in self.client.get('/api/v2/issues/?scope=others').data]
        self.assertIn('Four kilometres away', titles)
        self.assertIn(self.public.title, titles)
        self.assertNotIn('Too far to matter', titles)
        self.assertEqual(titles[0], 'Four kilometres away', 'nearest neighbourhood centre should come first')

    def test_a_bad_scope_is_refused(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get('/api/v2/issues/?scope=everything').status_code, 400)
