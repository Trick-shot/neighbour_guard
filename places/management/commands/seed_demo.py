"""Create the two demo people with homes ~100 m apart in Masaki. Safe to run more than once.

    python manage.py seed_demo                                  # local: fake emails are fine
    python manage.py seed_demo you@gmail.com juma@gmail.com      # a real server: use real inboxes

They sign in with a code emailed to them, so on a deployed server the addresses must be inboxes you
can actually open — the default `@test.tz` ones only work locally, where the console email backend
prints the code in the terminal. Give the real addresses as arguments instead.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from places.services import create_residence, residence_of

# email, name, house number, lat, lng
PEOPLE = [
    ('you@test.tz', 'Erick Luoga', '109', -6.7484, 39.2797),
    ('juma@test.tz', 'Juma Hassan', '110', -6.7475, 39.2797),
]


class Command(BaseCommand):
    help = 'Create two demo accounts with homes in the same neighbourhood.'

    def add_arguments(self, parser):
        parser.add_argument('emails', nargs='*', metavar='EMAIL',
                            help='Two addresses to use instead of the local defaults. On a real '
                                 'server these must be inboxes you can open: sign-in codes are emailed.')
        parser.add_argument('--names', nargs=2, metavar=('FIRST', 'SECOND'),
                            help='Display names, if the defaults do not suit.')

    def handle(self, *args, emails=None, names=None, **options):
        emails = emails or []
        if emails and len(emails) != 2:
            raise CommandError('Give exactly two emails, or none to use the local defaults.')

        User = get_user_model()
        for i, (default_email, default_name, house, lat, lng) in enumerate(PEOPLE):
            email = (emails[i] if emails else default_email).strip().lower()
            name = names[i] if names else default_name
            user, created = User.objects.get_or_create(
                email=email, defaults={'full_name': name, 'is_active': True})
            if created:
                user.set_unusable_password()  # they sign in with an emailed code
                user.save()
            elif not user.is_active:
                # An account left unactivated by sign-up cannot receive a sign-in code.
                user.is_active = True
                user.save(update_fields=['is_active'])
            if not residence_of(user):
                create_residence(user, house_number=house, street='Masaki St', district='Masaki',
                                 lat=lat, lng=lng)
            self.stdout.write(f'{email}: house {house}')

        if emails:
            self.stdout.write(self.style.SUCCESS(
                'Demo accounts ready. Sign both phones in now, before the pitch: the access token '
                'lasts a day and the refresh token 30 days, so the venue wifi and email are not in '
                'the demo path.'))
        else:
            self.stdout.write(self.style.SUCCESS(
                'Demo accounts ready. Locally the sign-in code is printed by the console email '
                'backend. On a real server, re-run with two real email addresses.'))
