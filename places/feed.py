"""The notifications feed (Figma "Notifications", 1631:1675).

It is built from what already happened — alerts, vouch requests, replies, coverage — instead of a
table of notification rows, so there is nothing to keep in sync and nothing that can leak more
than the underlying screens already show:

- An alert is labelled by house number only for verified members, by street otherwise, exactly
  like the neighbour list. My own alerts are left out: the sender of a duress alert must keep
  seeing it as resolved, and the feed must not be the place that gives that away.
- Vouch requests appear only for verified members of the same neighbourhood, who are the only
  people allowed to vouch.
"""
from datetime import timedelta

from django.utils import timezone

from .models import Residence
from .services import is_verified_member, residence_of

WINDOW_DAYS = 30


def _ago_minutes(start, end):
    return max(1, round((end - start).total_seconds() / 60))


def feed_for(user):
    from alerts.models import Alert
    from issues.models import IssueComment
    from providers.models import Subscription

    home = residence_of(user)
    if not home:
        return []
    nbh = home.neighbourhood
    verified = is_verified_member(user, nbh)
    since = timezone.now() - timedelta(days=WINDOW_DAYS)
    items = []

    alerts = (Alert.objects.filter(neighbourhood=nbh, status__in=[Alert.Status.SENT, Alert.Status.RESOLVED],
                                   sent_at__gte=since)
              .exclude(sender=user).select_related('residence').prefetch_related('responses')[:20])
    for a in alerts:
        coming = sum(1 for r in a.responses.all() if r.state in ('coming', 'arrived'))
        where = f'House {a.residence.house_number}' if verified else a.residence.street
        live = a.status == Alert.Status.SENT
        body = (f'Live now · {coming} responding' if live else
                f'Resolved in {_ago_minutes(a.sent_at, a.resolved_at or a.sent_at)} min. '
                f'{coming} neighbour{"" if coming == 1 else "s"} responded.')
        items.append({'id': f'alert-{a.id}', 'kind': 'alert', 'alert_id': a.id, 'live': live,
                      'title': f'{a.get_type_display()} at {where}', 'body': body, 'at': a.sent_at})

    if verified:
        pending = (Residence.objects.filter(neighbourhood=nbh, status=Residence.Status.PENDING, created_at__gte=since)
                   .exclude(pk=home.pk).exclude(vouches__voucher=user).prefetch_related('members__user')[:10])
        for r in pending:
            member = next(iter(r.members.all()), None)
            name = member.user.full_name if member else 'A neighbour'
            items.append({'id': f'vouch-{r.id}', 'kind': 'vouch', 'residence_id': r.id,
                          'title': f'{name} asked you to vouch',
                          'body': f'They say they live at House {r.house_number}.', 'at': r.created_at})

    replies = (IssueComment.objects.filter(created_at__gte=since, issue__neighbourhood=nbh)
               .filter(issue__created_by=user).exclude(author=user).select_related('author', 'issue')[:10])
    follows = (IssueComment.objects.filter(created_at__gte=since, issue__follows__user=user)
               .exclude(author=user).exclude(issue__created_by=user).select_related('author', 'issue')[:10])
    for c in list(replies) + list(follows):
        mine = c.issue.created_by_id == user.id
        items.append({'id': f'comment-{c.id}', 'kind': 'issue', 'issue_id': c.issue_id,
                      'title': f'{c.author.full_name} replied to {"your issue" if mine else "an issue you follow"}',
                      'body': f'“{c.body[:140]}”', 'at': c.created_at})

    for sub in (Subscription.objects.filter(neighbourhood=nbh, status=Subscription.Status.ACTIVE,
                                            starts_at__gte=since, members__residence=home)
                .select_related('plan__provider').distinct()[:3]):
        items.append({'id': f'cover-{sub.id}', 'kind': 'provider', 'title': f'{sub.plan.provider.name} now covers your street',
                      'body': f'Their guards get alerts from {nbh.name}.', 'at': sub.starts_at})

    if home.created_at >= since:
        count = Residence.objects.filter(neighbourhood=nbh, status=Residence.Status.VERIFIED).exclude(pk=home.pk).count()
        items.append({'id': f'welcome-{home.id}', 'kind': 'welcome', 'title': f'Welcome to {nbh.name}',
                      'body': f'{count} verified neighbour{"" if count == 1 else "s"} live within {nbh.radius_m} m.',
                      'at': home.created_at})

    seen = user.notifications_seen_at
    for item in items:
        item['unread'] = seen is None or item['at'] > seen
    items.sort(key=lambda i: i['at'], reverse=True)
    return items
