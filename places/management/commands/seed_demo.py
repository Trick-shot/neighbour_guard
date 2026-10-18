"""Create the two demo people with homes ~100 m apart in Masaki. Safe to run more than once.

    python manage.py seed_demo
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from places.services import create_residence, residence_of

PEOPLE = [
    ('you@test.tz', 'Erick Luoga', '109', -6.7484, 39.2797),
    ('juma@test.tz', 'Juma Hassan', '110', -6.7475, 39.2797),
]


class Command(BaseCommand):
    help = 'Create two demo accounts with homes in the same neighbourhood.'

    def handle(self, *args, **options):
        User = get_user_model()
        for email, name, house, lat, lng in PEOPLE:
            user, created = User.objects.get_or_create(email=email, defaults={'full_name': name, 'is_active': True})
            if created:
                user.set_unusable_password()  # they sign in with an emailed code
                user.save()
            if not residence_of(user):
                create_residence(user, house_number=house, street='Masaki St', district='Masaki', lat=lat, lng=lng)
            self.stdout.write(f'{email}: house {house}')
        self.stdout.write(self.style.SUCCESS('Demo accounts ready. Sign in with the code printed by the console email backend.'))
