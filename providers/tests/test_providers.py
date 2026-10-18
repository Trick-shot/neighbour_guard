"""Pools, payments and dispatch. The money rules are tested from the side that must fail."""
import uuid
from datetime import timedelta
from unittest import mock

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from alerts import services as alert_services
from main.models import Profile
from places.tests.factories import home, user
from providers import services
from providers.models import Dispatch, Payment, Plan, Provider, Subscription, SubscriptionMember

SECRET = 'callback-secret-for-tests'
CALLBACK = f'/api/v2/providers/mpesa/callback/?key={SECRET}'

MPESA = dict(MPESA_BASE_URL='https://example.test', MPESA_KEY='k', MPESA_SECRET='s',
             MPESA_SHORTCODE='123456', MPESA_PASSKEY='p',
             MPESA_CALLBACK_URL='https://example.test/cb', MPESA_CALLBACK_SECRET=SECRET)


def callback(checkout_id, *, ok=True, receipt='QGH1234567', amount=15000):
    body = {'Body': {'stkCallback': {
        'CheckoutRequestID': checkout_id,
        'ResultCode': 0 if ok else 1032,
        'ResultDesc': 'Accepted' if ok else 'Request cancelled by user',
    }}}
    if ok:
        body['Body']['stkCallback']['CallbackMetadata'] = {'Item': [
            {'Name': 'Amount', 'Value': amount},
            {'Name': 'MpesaReceiptNumber', 'Value': receipt},
            {'Name': 'PhoneNumber', 'Value': 255754000111},
        ]}
    return body


class PoolTests(APITestCase):
    def setUp(self):
        self.a = user('a@x.tz', 'Asha')
        self.home_a = home(self.a, house='109')                      # founds the area, verified
        self.b = user('b@x.tz', 'Juma')
        self.home_b = home(self.b, house='110', north=60, verified=True)
        self.unverified = user('u@x.tz')
        home(self.unverified, house='111', north=80)
        for u in (self.a, self.b):
            Profile.objects.update_or_create(user=u, defaults={'phone_number': f'+25575400011{u.pk}',
                                                               'is_phone_verified': True})
        self.provider = Provider.objects.create(name='Masaki Security', verified=True, phone='+255754111222')
        self.provider.coverage.add(self.home_a.neighbourhood)
        self.plan = Plan.objects.create(provider=self.provider, name='Street patrol', price_tsh=15000,
                                        min_houses=2)

    # --- who may join -------------------------------------------------------
    def test_providers_listed_are_only_verified_ones_covering_my_area(self):
        hidden = Provider.objects.create(name='Unverified Ltd', verified=False)
        hidden.coverage.add(self.home_a.neighbourhood)
        elsewhere = Provider.objects.create(name='Other Area Co', verified=True)
        self.client.force_authenticate(self.a)
        names = {p['name'] for p in self.client.get('/api/v2/providers/').data}
        self.assertEqual(names, {'Masaki Security'})
        self.assertNotIn('Unverified Ltd', names)
        self.assertNotIn('Other Area Co', names)

    def test_an_unverified_home_cannot_join(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.post(f'/api/v2/providers/plans/{self.plan.pk}/join/')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(SubscriptionMember.objects.exists())

    def test_joining_needs_a_login(self):
        self.assertEqual(self.client.post(f'/api/v2/providers/plans/{self.plan.pk}/join/').status_code, 401)

    def test_a_provider_that_does_not_cover_my_area_is_refused(self):
        other = Provider.objects.create(name='Far Co', verified=True)
        plan = Plan.objects.create(provider=other, name='Patrol', price_tsh=9000, min_houses=1)
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.post(f'/api/v2/providers/plans/{plan.pk}/join/').status_code, 403)

    # --- the pool fills -----------------------------------------------------
    @override_settings(**MPESA)
    def test_nobody_is_charged_until_the_pool_reaches_the_minimum(self):
        with mock.patch('providers.tasks.request_member_payment') as push:
            self.client.force_authenticate(self.a)
            r = self.client.post(f'/api/v2/providers/plans/{self.plan.pk}/join/')
            self.assertEqual(r.status_code, 201, r.data)
            self.assertEqual(r.data['joined'], 1)
            self.assertEqual(r.data['needed'], 2)
            push.delay.assert_not_called()          # one house: nobody pays

            self.client.force_authenticate(self.b)
            r = self.client.post(f'/api/v2/providers/plans/{self.plan.pk}/join/')
            self.assertEqual(r.data['joined'], 2)
            self.assertEqual(push.delay.call_count, 2)   # the pool filled: both are asked

        self.assertEqual(
            set(SubscriptionMember.objects.values_list('status', flat=True)), {'invited'})

    @override_settings(**MPESA)
    def test_a_second_fill_does_not_ask_the_same_house_twice(self):
        with mock.patch('providers.tasks.request_member_payment') as push:
            services.join_pool(self.a, self.plan)
            services.join_pool(self.b, self.plan)
            self.assertEqual(push.delay.call_count, 2)
            subscription = Subscription.objects.get()
            services.maybe_collect(subscription)
            services.maybe_collect(subscription)
            self.assertEqual(push.delay.call_count, 2)   # still two

    # --- paying -------------------------------------------------------------
    @override_settings(**MPESA)
    def _fill_and_push(self):
        with mock.patch('providers.tasks.request_member_payment'):
            services.join_pool(self.a, self.plan)
            services.join_pool(self.b, self.plan)
        payments = []
        for member in SubscriptionMember.objects.all():
            with mock.patch('providers.mpesa.request_payment', return_value=f'checkout-{member.pk}'):
                payments.append(services.start_payment(member))
        return payments

    @override_settings(**MPESA)
    def test_only_a_callback_marks_a_payment_paid(self):
        payments = self._fill_and_push()
        payment = payments[0]
        self.assertEqual(payment.status, Payment.Status.PENDING)

        # The phone polling does not change anything.
        self.client.force_authenticate(payment.member.user)
        polled = self.client.get(f'/api/v2/providers/payments/{payment.pk}/')
        self.assertEqual(polled.data['status'], 'pending')
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PENDING)

        r = self.client.post(CALLBACK, callback(payment.checkout_id), format='json')
        self.assertEqual(r.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PAID)
        self.assertEqual(payment.mpesa_ref, 'QGH1234567')
        self.assertIsNotNone(payment.raw_callback)
        payment.member.refresh_from_db()
        self.assertEqual(payment.member.status, SubscriptionMember.Status.PAID)

    @override_settings(**MPESA)
    def test_someone_elses_payment_is_a_404(self):
        payments = self._fill_and_push()
        mine, theirs = payments[0], payments[1]
        self.client.force_authenticate(mine.member.user)
        self.assertEqual(self.client.get(f'/api/v2/providers/payments/{theirs.pk}/').status_code, 404)

    @override_settings(**MPESA)
    def test_a_replayed_callback_changes_nothing(self):
        payments = self._fill_and_push()
        payment = payments[0]
        self.client.post(CALLBACK, callback(payment.checkout_id), format='json')
        self.client.post(CALLBACK, callback(payment.checkout_id), format='json')
        self.assertEqual(Payment.objects.filter(status=Payment.Status.PAID).count(), 1)
        self.assertEqual(payment.member.payments.filter(status=Payment.Status.PAID).count(), 1)

    @override_settings(**MPESA)
    def test_a_cancelled_payment_is_marked_failed_not_paid(self):
        payment = self._fill_and_push()[0]
        self.client.post(CALLBACK, callback(payment.checkout_id, ok=False), format='json')
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(Subscription.objects.get().status, Subscription.Status.GATHERING)

    @override_settings(**MPESA)
    def test_the_callback_needs_the_secret(self):
        payment = self._fill_and_push()[0]
        r = self.client.post('/api/v2/providers/mpesa/callback/?key=wrong',
                             callback(payment.checkout_id), format='json')
        self.assertEqual(r.status_code, 403)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PENDING)

    @override_settings(**{**MPESA, 'MPESA_CALLBACK_SECRET': ''})
    def test_with_no_secret_configured_the_callback_refuses_everything(self):
        r = self.client.post('/api/v2/providers/mpesa/callback/', {}, format='json')
        self.assertEqual(r.status_code, 503)

    @override_settings(**MPESA)
    def test_a_callback_for_an_unknown_checkout_is_stored_nowhere_and_breaks_nothing(self):
        r = self.client.post(CALLBACK, callback('checkout-that-never-existed'), format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Payment.objects.filter(status=Payment.Status.PAID).exists())

    # --- activation ---------------------------------------------------------
    @override_settings(**MPESA)
    def test_coverage_activates_once_even_if_two_payments_land_together(self):
        payments = self._fill_and_push()
        with mock.patch('providers.services.logger') as log:
            for payment in payments:
                self.client.post(CALLBACK, callback(payment.checkout_id,
                                                    receipt=f'R{payment.pk}'), format='json')
            subscription = Subscription.objects.get()
            self.assertEqual(subscription.status, Subscription.Status.ACTIVE)
            activations = [c for c in log.info.call_args_list if 'now active' in str(c)]
            self.assertEqual(len(activations), 1, 'a provider must not be told to start twice')

        # Calling it again changes nothing.
        self.assertFalse(services.activate_if_paid(Subscription.objects.get()))

    @override_settings(**MPESA)
    def test_coverage_lapses_when_members_stop_being_paid_up(self):
        payments = self._fill_and_push()
        for payment in payments:
            self.client.post(CALLBACK, callback(payment.checkout_id, receipt=f'R{payment.pk}'), format='json')
        self.assertEqual(Subscription.objects.get().status, Subscription.Status.ACTIVE)

        SubscriptionMember.objects.update(paid_until=timezone.now() - timedelta(days=1))
        self.assertEqual(services.lapse_unpaid(), 1)
        self.assertEqual(Subscription.objects.get().status, Subscription.Status.LAPSED)
        # And a second sweep does not re-lapse it.
        self.assertEqual(services.lapse_unpaid(), 0)

    @override_settings(**MPESA)
    def test_a_gateway_failure_puts_the_member_back_in_the_pool(self):
        from providers.tasks import request_member_payment
        with mock.patch('providers.tasks.request_member_payment'):
            services.join_pool(self.a, self.plan)
            services.join_pool(self.b, self.plan)
        member = SubscriptionMember.objects.first()
        with mock.patch('providers.mpesa.request_payment',
                        side_effect=services.PoolError('gateway down', 'gateway')):
            request_member_payment(member.pk)
        member.refresh_from_db()
        self.assertEqual(member.status, SubscriptionMember.Status.JOINED)

    def test_asking_for_a_payment_with_no_gateway_configured_does_not_pretend(self):
        with mock.patch('providers.tasks.request_member_payment'):
            services.join_pool(self.a, self.plan)
            services.join_pool(self.b, self.plan)
        member = SubscriptionMember.objects.first()
        with self.assertRaises(services.PoolError) as caught:
            services.start_payment(member)
        self.assertEqual(caught.exception.code, 'gateway')
        self.assertEqual(member.payments.get().status, Payment.Status.FAILED)


class DispatchTests(APITestCase):
    """An SOS on a paid-up street asks the provider's guard to go."""

    @override_settings(**MPESA)
    def setUp(self):
        self.sender = user('s@x.tz', 'Sara')
        self.home = home(self.sender, house='109')
        home(user('n@x.tz'), house='110', north=80, verified=True)
        Profile.objects.update_or_create(user=self.sender,
                                         defaults={'phone_number': '+255754000111', 'is_phone_verified': True})
        self.provider = Provider.objects.create(name='Masaki Security', verified=True, phone='+255754111222')
        self.provider.coverage.add(self.home.neighbourhood)
        self.plan = Plan.objects.create(provider=self.provider, name='Street patrol', price_tsh=15000,
                                        min_houses=1)
        with mock.patch('providers.tasks.request_member_payment'):
            self.member = services.join_pool(self.sender, self.plan)

    def _send_alert(self):
        with mock.patch('alerts.tasks.send_alert'), mock.patch('alerts.tasks.widen_if_no_response'), \
                mock.patch('alerts.tasks.notify_emergency_contacts'), \
                mock.patch('providers.tasks.notify_guards') as guards, \
                mock.patch('alerts.push.send', return_value=1):
            with self.captureOnCommitCallbacks(execute=True):
                alert, _ = alert_services.create_alert(self.sender, client_id=uuid.uuid4(), type='robbery')
            alert_services.claim_and_send(alert.pk)
        return alert, guards

    def test_no_dispatch_while_the_street_is_not_paid_up(self):
        alert, guards = self._send_alert()
        self.assertFalse(Dispatch.objects.exists())
        guards.delay.assert_not_called()

    @override_settings(**MPESA)
    def test_a_paid_up_street_gets_a_guard_asked_and_the_sender_told(self):
        with mock.patch('providers.mpesa.request_payment', return_value='checkout-1'):
            payment = services.start_payment(self.member)
        self.client.post(CALLBACK, callback(payment.checkout_id), format='json')
        self.assertEqual(Subscription.objects.get().status, Subscription.Status.ACTIVE)

        alert, guards = self._send_alert()
        dispatch = Dispatch.objects.get()
        self.assertEqual(dispatch.provider, self.provider)
        self.assertEqual(dispatch.status, Dispatch.Status.REQUESTED)
        guards.delay.assert_called_once()

        # The sender's alert carries the guard, with its real state: asked, not coming.
        self.client.force_authenticate(self.sender)
        payload = self.client.get(f'/api/v2/alerts/{alert.pk}/').data
        summary = alert_services.alert_summary(alert)
        self.assertEqual(summary['guards'], [{'provider': 'Masaki Security', 'status': 'requested',
                                              'eta_min': None, 'name': None}])
        self.assertEqual(payload['status'], 'sent')
