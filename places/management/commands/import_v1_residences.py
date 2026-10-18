"""Copy v1 homes (main.Residence + main.Location) into v2 places. Safe to run more than once.

    python manage.py import_v1_residences --dry-run
    python manage.py import_v1_residences
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from main.models import Residence as V1Residence
from places.models import Residence, ResidenceMember
from places.services import _on_residence_joined, find_or_create_neighbourhood


class Command(BaseCommand):
    help = 'Import v1 residences into the v2 places app.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, dry_run=False, **options):
        created = skipped = 0
        for old in V1Residence.objects.select_related('location').prefetch_related('residence_members'):
            members = [u for u in old.residence_members.all() if not ResidenceMember.objects.filter(user=u).exists()]
            if not old.location or old.location.latitude is None or not members:
                skipped += 1
                continue
            created += 1
            if dry_run:
                continue
            with transaction.atomic():
                lat, lng = old.location.latitude, old.location.longitude
                street = old.street_name or old.residence_name or 'Unknown street'
                neighbourhood = find_or_create_neighbourhood(lat, lng, street, old.district or '')
                residence = Residence.objects.create(
                    neighbourhood=neighbourhood, house_number=str(old.house_number), street=street,
                    district=old.district or '', lat=lat, lng=lng,
                    # Existing users were never vouched for; keep them verified so the demo works,
                    # and re-check them by hand in the admin.
                    status=Residence.Status.VERIFIED,
                )
                for i, member in enumerate(members):
                    role = ResidenceMember.Role.OWNER if i == 0 else ResidenceMember.Role.MEMBER
                    ResidenceMember.objects.create(residence=residence, user=member, role=role)
                    _on_residence_joined(member, residence)
        verb = 'Would import' if dry_run else 'Imported'
        self.stdout.write(self.style.SUCCESS(f'{verb} {created} residences, skipped {skipped}.'))
