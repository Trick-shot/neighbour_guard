from celery import shared_task


@shared_task(ignore_result=True)
def notify_followers(issue_id: int, status: str):
    """Push to everyone following an issue when its status changes. Slow work, so it is a task."""
    from alerts import push

    from .models import Issue

    issue = Issue.objects.select_related('neighbourhood').filter(pk=issue_id).first()
    if not issue:
        return
    tokens = [
        token for token in issue.follows.exclude(user=issue.created_by)
        .values_list('user__push_token', flat=True) if token
    ]
    if not tokens:
        return
    label = dict(Issue.Status.choices).get(status, status)
    push.send([
        {
            'to': token,
            'title': issue.title,
            'body': f'Now: {label}',
            'data': {'kind': 'issue', 'issue_id': issue.pk},
            'priority': 'default',
            'ttl': 86_400,
        }
        for token in tokens
    ])
