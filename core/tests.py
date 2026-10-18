"""Security tests for phone OTP (holes 5 and 6 in docs/reference/backend.md)."""
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from main.models import OTPVerification, Profile

User = get_user_model()


class OTPTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='a@x.tz', password='pw-12345!', full_name='Asha')

    def test_send_requires_login(self):
        r = self.client.post('/api/auth/send-otp/', {'phone_number': '0754000000', 'email': 'a@x.tz'})
        self.assertEqual(r.status_code, 401)

    @mock.patch('core.views.send_sms', return_value=True)
    def test_send_does_not_touch_profile_phone_until_verified(self, _sms):
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/auth/send-otp/', {'phone_number': '0754000000'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Profile.objects.get(user=self.user).phone_number, '')
        self.assertEqual(OTPVerification.objects.get(user=self.user).phone_number, '+255754000000')

    @mock.patch('core.views.send_sms', return_value=True)
    def test_send_is_rate_limited(self, _sms):
        self.client.force_authenticate(self.user)
        codes = [self.client.post('/api/auth/send-otp/', {'phone_number': '0754000000'}).status_code for _ in range(4)]
        self.assertEqual(codes, [200, 200, 200, 429])

    def _otp(self, code='123456', **kw):
        from core.views import hash_otp
        return OTPVerification.objects.create(user=self.user, phone_number='+255754000000', otp=hash_otp(code), **kw)

    def test_verify_sets_phone_from_the_otp_record(self):
        self._otp()
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/auth/verify-otp/', {'otp': '123456', 'phone_number': '+255700999999'})
        self.assertEqual(r.status_code, 200)
        profile = Profile.objects.get(user=self.user)
        self.assertEqual(profile.phone_number, '+255754000000')  # not the number in the body
        self.assertTrue(profile.is_phone_verified)

    def test_verify_rejects_expired_code(self):
        otp = self._otp()
        OTPVerification.objects.filter(pk=otp.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/auth/verify-otp/', {'otp': '123456'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('expired', r.data['error'])

    def test_verify_locks_after_three_wrong_codes(self):
        self._otp()
        self.client.force_authenticate(self.user)
        for _ in range(3):
            self.client.post('/api/auth/verify-otp/', {'otp': '000000'})
        r = self.client.post('/api/auth/verify-otp/', {'otp': '123456'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('Too many', r.data['error'])

    def test_another_users_code_is_not_found(self):
        self._otp()
        other = User.objects.create_user(email='b@x.tz', password='pw-12345!', full_name='Baraka')
        self.client.force_authenticate(other)
        r = self.client.post('/api/auth/verify-otp/', {'otp': '123456'})
        self.assertEqual(r.status_code, 404)


class EmailCodeTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='a@x.tz', password='pw-12345!', full_name='Asha')

    def _code_from_mail(self):
        from django.core import mail
        import re
        return re.search(r'(\d{6})', mail.outbox[-1].body).group(1)

    def test_sign_in_with_an_emailed_code(self):
        self.assertEqual(self.client.post('/api/auth/email-code/', {'email': 'A@x.tz'}).status_code, 200)
        r = self.client.post('/api/auth/email-code/verify/', {'email': 'a@x.tz', 'code': self._code_from_mail()})
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)

    def test_unknown_email_looks_the_same_and_sends_nothing(self):
        from django.core import mail
        r = self.client.post('/api/auth/email-code/', {'email': 'nobody@x.tz'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_code_works_once_and_wrong_codes_are_limited(self):
        self.client.post('/api/auth/email-code/', {'email': 'a@x.tz'})
        code = self._code_from_mail()
        for _ in range(5):
            self.client.post('/api/auth/email-code/verify/', {'email': 'a@x.tz', 'code': '000000'})
        r = self.client.post('/api/auth/email-code/verify/', {'email': 'a@x.tz', 'code': code})
        self.assertEqual(r.status_code, 400)
