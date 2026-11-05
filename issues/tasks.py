from celery import shared_task


@shared_task(ignore_result=True)
def notify_followers(issue_id: int, status: str):
    """Push to everyone following an issue when its status changes. Slow work, so it is a task."""
    from alerts import push

    from .models import Issue

    issue = Issue.objects.select_related('neighbourhood').filter(pk=issue_id).first()
    if not issue:
        return
    # Routine news: respects each follower's "Messages & issues" switch and quiet hours.
    tokens = [
        f.user.push_token for f in issue.follows.exclude(user=issue.created_by).select_related('user')
        if f.user.push_token and f.user.wants_routine_push()
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
