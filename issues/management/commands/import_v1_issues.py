"""Copy the v1 issues (main.Issue) into the v2 `issues` app. Safe to run more than once.

    python manage.py import_v1_issues --dry-run
    python manage.py import_v1_issues

The neighbourhood comes from the reporter's own residence, as it does for a new issue. An issue
whose reporter has no home cannot be placed, so it goes to an `unassigned` neighbourhood that no
resident belongs to — staff see it in the admin, nobody else sees it at all.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from issues.models import Issue
from main.models import Issue as V1Issue
from places.models import Neighbourhood
from places.services import residence_of

UNASSIGNED_SLUG = 'unassigned'

# v1 had two categories; v2 has six. Anything else becomes "other".
CATEGORY = {'community': Issue.Category.OTHER, 'neighbours': Issue.Category.SECURITY}


def unassigned_neighbourhood() -> Neighbourhood:
    neighbourhood, _ = Neighbourhood.objects.get_or_create(
        slug=UNASSIGNED_SLUG,
        defaults={'name': 'Unassigned (imported)', 'centre_lat': 0, 'centre_lng': 0, 'radius_m': 1},
    )
    return neighbourhood


class Command(BaseCommand):
    help = 'Copy v1 issues into the v2 issues app.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, dry_run=False, **options):
        copied = placed = orphaned = skipped = 0
        for old in V1Issue.objects.select_related('created_by').order_by('id'):
            # Re-runnable: the same reporter and title is taken as already copied.
            if Issue.objects.filter(created_by=old.created_by, title=old.title[:140]).exists():
                skipped += 1
                continue
            home = residence_of(old.created_by) if old.created_by_id else None
            if home:
                neighbourhood = home.neighbourhood
                placed += 1
            else:
                neighbourhood = None if dry_run else unassigned_neighbourhood()
                orphaned += 1
            copied += 1
            if dry_run:
                continue
            with transaction.atomic():
                issue = Issue.objects.create(
                    neighbourhood=neighbourhood,
                    created_by=old.created_by,
                    title=old.title[:140],
                    description=old.description or '',
                    category=CATEGORY.get(old.category, Issue.Category.OTHER),
                    severity=old.severity if old.severity in dict(Issue.Severity.choices) else Issue.Severity.LOW,
                    visibility=Issue.Visibility.NEIGHBOURHOOD,
                )
                # created_at is auto_now_add, so the original date is restored by hand.
                Issue.objects.filter(pk=issue.pk).update(created_at=old.created_at)
                for media in old.media.all():
                    issue.media.create(image=media.image)

        verb = 'Would copy' if dry_run else 'Copied'
        self.stdout.write(f'{verb} {copied} issues: {placed} placed from the reporter\'s home, '
                          f'{orphaned} unassigned. Skipped {skipped} already copied.')
        if orphaned and not dry_run:
            self.stdout.write(self.style.WARNING(
                f'{orphaned} issues went to "{UNASSIGNED_SLUG}" because their reporter has no v2 home. '
                'Only staff can see those.'))
