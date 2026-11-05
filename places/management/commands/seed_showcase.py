"""Fill a local database so every screen has something real to show. Safe to run more than once.

    DJANGO_SETTINGS_MODULE=backend.settings_local python manage.py seed_showcase

Builds on `seed_demo` (Erick at House 109, Juma at 110 in Masaki) and adds: more neighbours (one
still waiting for vouches), issues in Masaki and a public one from Oysterbay, emergency contacts
and a household for Erick, a past alert he sent and one he answered, and three security providers
— one plan active, one street pool gathering, one M-Pesa prompt waiting.

Local only. Never run it against a server people use: it invents people and payments.
"""
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

PHOTO = Path(__file__).with_name('showcase_waste.jpg')


class Command(BaseCommand):
    help = 'Local showcase data on top of seed_demo (issues, providers, contacts, history).'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_showcase invents people and payments: local (DEBUG) databases only.')

        from alerts.models import Alert, AlertResponse
        from core.models import EmergencyContact, User
        from issues.models import Issue, IssueComment, IssueMedia, IssueSupport
        from main.models import Profile
        from places.models import HouseholdPerson, Neighbourhood, Residence, ResidenceMember
        from places.services import create_residence, residence_of
        from providers.models import Payment, Plan, Provider, Subscription, SubscriptionMember

        call_command('seed_demo', stdout=self.stdout)
        you = User.objects.get(email='you@test.tz')
        juma = User.objects.get(email='juma@test.tz')
        home = residence_of(you)
        nb = home.neighbourhood
        now = timezone.now()

        def person(email, name, house, dlat, dlng, verified=True):
            u, _ = User.objects.get_or_create(email=email, defaults={'full_name': name, 'is_active': True})
            if not residence_of(u):
                create_residence(u, house_number=house, street='Masaki St', district='Masaki',
                                 lat=home.lat + dlat, lng=home.lng + dlng)
            r = residence_of(u)
            if verified and r.status != 'verified':
                Residence.objects.filter(pk=r.pk).update(status='verified', verified_at=now)
            return u

        Residence.objects.filter(pk=residence_of(juma).pk).update(status='verified', verified_at=now)
        asha = person('asha@test.tz', 'Asha Mrisho', '112', 0.0006, 0.0009)
        peter = person('peter@test.tz', 'Peter Mwakyusa', '114', -0.0007, 0.0004)
        person('ritha@test.tz', 'Ritha Komba', '111', 0.0004, -0.0006, verified=False)
        neighbours = [juma, asha, peter]

        # A verified phone, so the SMS and M-Pesa screens have a number to show.
        Profile.objects.update_or_create(user=you, defaults={'phone_number': '+255754375852', 'is_phone_verified': True})

        if not EmergencyContact.objects.filter(user=you).exists():
            EmergencyContact.objects.create(user=you, name='Grace Luoga', relation='Mama', phone='+255713000221')
            EmergencyContact.objects.create(user=you, name='David Luoga', relation='Brother', phone='+255765004410')
        if not home.household.exists():
            HouseholdPerson.objects.create(residence=home, name='Grace Luoga', relation='Mother', age_group='adult')
            HouseholdPerson.objects.create(residence=home, name='Baraka', relation='Son', age_group='child')
            HouseholdPerson.objects.create(residence=home, name='Babu Ally', relation='Grandfather', age_group='elderly', needs_help=True)

        # Alert history: one Erick sent, one he answered.
        if not Alert.objects.exists():
            mine = Alert.objects.create(sender=you, residence=home, neighbourhood=nb, client_id=uuid.uuid4(),
                                        type='robbery', status='resolved', send_at=now - timedelta(days=12),
                                        sent_at=now - timedelta(days=12), resolved_at=now - timedelta(days=12) + timedelta(minutes=9))
            for i, u in enumerate(neighbours):
                AlertResponse.objects.create(alert=mine, responder=u, state='arrived', created_at=mine.sent_at + timedelta(seconds=70 + 40 * i))
            theirs = Alert.objects.create(sender=juma, residence=residence_of(juma), neighbourhood=nb, client_id=uuid.uuid4(),
                                          type='medical', status='resolved', send_at=now - timedelta(days=3),
                                          sent_at=now - timedelta(days=3), resolved_at=now - timedelta(days=3) + timedelta(minutes=6))
            AlertResponse.objects.create(alert=theirs, responder=you, state='arrived', created_at=theirs.sent_at + timedelta(seconds=95))

        # Issues: two in Masaki, one public from Oysterbay.
        if not Issue.objects.exists():
            i = Issue.objects.create(neighbourhood=nb, created_by=juma, title='Poor waste disposal is making our street unsafe',
                                     description="People are dumping rubbish anywhere along Masaki St. It is a health hazard to us and our children. Let's agree on a collection point and ask the mtaa office for a bin.",
                                     category='waste', severity='moderate', visibility='public', lat=home.lat + 0.004, lng=home.lng + 0.003)
            with PHOTO.open('rb') as f:
                IssueMedia.objects.create(issue=i, image=File(f, name='waste.jpg'))
            for u in neighbours:
                IssueSupport.objects.get_or_create(issue=i, user=u)
            IssueComment.objects.create(issue=i, author=juma, body='Agreed, this is risky for our children. I can talk to the mtaa office on Monday.')
            Issue.objects.create(neighbourhood=nb, created_by=you, title='Street lights out on Hekima St',
                                 description='Three lights have been off for a week. It is very dark after 7 pm.',
                                 category='lighting', severity='low', lat=home.lat - 0.002, lng=home.lng + 0.001)

            oyster, _ = Neighbourhood.objects.get_or_create(slug='oysterbay', defaults=dict(
                name='Oysterbay', centre_lat=home.lat + 0.009, centre_lng=home.lng - 0.006, radius_m=600))
            amina, made = User.objects.get_or_create(email='amina@test.tz', defaults={'full_name': 'Amina Said', 'is_active': True})
            if made:
                r = Residence.objects.create(neighbourhood=oyster, house_number='22', street='Haile Selassie Rd',
                                             lat=oyster.centre_lat, lng=oyster.centre_lng, status='verified', verified_at=now)
                ResidenceMember.objects.create(residence=r, user=amina, role='owner')
            o = Issue.objects.create(neighbourhood=oyster, created_by=amina, title='Dumping site behind Oysterbay market',
                                     description='Traders are leaving rubbish behind the market every evening. It is spreading onto the road and blocking the drain.',
                                     category='waste', severity='moderate', visibility='public', lat=oyster.centre_lat, lng=oyster.centre_lng + 0.001)
            with PHOTO.open('rb') as f:
                IssueMedia.objects.create(issue=o, image=File(f, name='waste2.jpg'))
            IssueComment.objects.create(issue=o, author=amina, body='The market committee meets on Thursday. I will raise it there.')

        # Security providers: one plan active, one street pool gathering, one M-Pesa prompt waiting.
        if not Provider.objects.exists():
            features = ['Guards get your alerts instantly', 'Night patrol, 22:00–05:00', 'Direct line to the guard on duty']

            def provider(name, rating, reviews, minutes, price, duty=''):
                p = Provider.objects.create(name=name, licence_no='TPF/2025/118', verified=True, rating=rating,
                                            review_count=reviews, response_min=minutes, phone='+255754111222',
                                            on_duty_name=duty, on_duty_shift='Night patrol · 22:00–05:00' if duty else '')
                p.coverage.add(nb)
                street = Plan.objects.create(provider=p, kind='street', name='Whole street', price_tsh=price, min_houses=8, features=features)
                house = Plan.objects.create(provider=p, kind='house', name='Just my house', price_tsh=int(price * 1.5),
                                            min_houses=1, description='Only your home is covered', features=features)
                return street, house

            mg_street, _ = provider('Masaki Guard Services', 4.8, 112, 6, 10000, 'Baraka Mwita')
            ks_street, _ = provider('Kinondoni Shield', 4.6, 74, 9, 12000)
            _, sp_house = provider('SafeStreet Patrol', 4.3, 31, 12, 8000)

            sub = Subscription.objects.create(plan=mg_street, neighbourhood=nb, street='Masaki St', status='active', starts_at=now - timedelta(days=18))
            m = SubscriptionMember.objects.create(subscription=sub, residence=home, user=you, status='paid', paid_until=now + timedelta(days=12))
            Payment.objects.create(member=m, amount_tsh=10000, phone='+255754375852', status='paid', mpesa_ref='QJK7X2LM4P', settled_at=now - timedelta(days=18))
            for u in neighbours:
                SubscriptionMember.objects.create(subscription=sub, residence=residence_of(u), user=u, status='paid')
            pool = Subscription.objects.create(plan=ks_street, neighbourhood=nb, street='Masaki St', status='gathering')
            SubscriptionMember.objects.create(subscription=pool, residence=home, user=you, status='joined')
            for u in neighbours[:2]:
                SubscriptionMember.objects.create(subscription=pool, residence=residence_of(u), user=u, status='joined')
            waiting = Subscription.objects.create(plan=sp_house, neighbourhood=nb, street='Masaki St', status='gathering')
            wm = SubscriptionMember.objects.create(subscription=waiting, residence=home, user=you, status='invited')
            Payment.objects.create(member=wm, amount_tsh=sp_house.price_tsh, phone='+255754375852', status='pending', checkout_id='local-showcase')

        self.stdout.write(self.style.SUCCESS(
            'Showcase ready. Sign in as you@test.tz (or juma@test.tz); the code is printed by runserver.'))
