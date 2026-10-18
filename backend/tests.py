"""Project-level configuration that security depends on.

These are not feature tests. They pin down two things that are easy to break by editing
`MIDDLEWARE` or `settings.py` and that nothing else would notice until it mattered.
"""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from rest_framework.test import APIClient

User = get_user_model()


class CsrfTests(TestCase):
    """CSRF protection must never reach the JWT API, and must always cover the admin.

    The API is JWT-only and every endpoint is a DRF view, which DRF makes csrf_exempt, so a phone
    with no CSRF cookie has to keep working. The admin is the one place we serve a session cookie.
    """

    def test_the_api_still_works_without_a_csrf_token(self):
        # A phone never has a CSRF cookie. If this ever starts failing, the mobile app is broken.
        client = APIClient(enforce_csrf_checks=True)
        r = client.post('/api/auth/email-code/', {'email': 'nobody@x.tz'})
        self.assertEqual(r.status_code, 200)

    def test_an_authenticated_api_post_still_works_without_a_csrf_token(self):
        user = User.objects.create_user(email='a@x.tz', password='pw-12345!', full_name='Asha')
        client = APIClient(enforce_csrf_checks=True)
        client.force_authenticate(user)
        r = client.post('/api/v2/alerts/push-token/', {'token': 'ExponentPushToken[x]'})
        self.assertEqual(r.status_code, 200)

    def test_the_admin_refuses_a_post_without_a_csrf_token(self):
        # Django's AdminSite wraps each of its views in csrf_protect, so this holds with or
        # without CsrfViewMiddleware. It is here to catch the day that stops being true.
        client = Client(enforce_csrf_checks=True)
        r = client.post('/api/admin/login/', {'username': 'a@x.tz', 'password': 'pw-12345!'})
        self.assertEqual(r.status_code, 403)
