"""Who may see, support, comment on and share an issue. The app mirrors these; the server decides.

The table in docs/reference/backend.md, "Issues":

| Who                                      | Sees                      | Support / follow | Comment | Share |
| verified resident of the issue's area    | all its issues            | yes              | yes     | yes   |
| verified resident of another area        | public issues only        | yes              | no      | no    |
| unverified member                        | own area's issues, street | no               | no      | no    |
"""
import logging

from django.conf import settings
from django.db.models import Count, Exists, OuterRef, Q

from places.geo import distance_m
from places.services import residence_of

from .models import Issue, IssueFollow, IssueSupport

logger = logging.getLogger(__name__)

NEARBY_M = 5_000  # how far "issues in other areas" reaches, from my neighbourhood's centre


def with_counts(queryset, user):
    """Support and follow counts, plus whether *I* have supported or followed each issue."""
    return queryset.annotate(
        support_count=Count('supports', distinct=True),
        comment_count=Count('comments', distinct=True),
        i_support=Exists(IssueSupport.objects.filter(issue=OuterRef('pk'), user=user)),
        i_follow=Exists(IssueFollow.objects.filter(issue=OuterRef('pk'), user=user)),
    ).select_related('neighbourhood', 'created_by')


def visible_to(user):
    """Every issue this user may know exists. The queryset itself excludes the rest.

    Staff see everything, including the issues imported from v1 whose reporter had no home.
    """
    if user.is_staff:
        return Issue.objects.all()
    home = residence_of(user)
    if not home:
        # No home means no neighbourhood: public issues are all there is to see.
        return Issue.objects.filter(visibility=Issue.Visibility.PUBLIC)
    return Issue.objects.filter(
        Q(neighbourhood=home.neighbourhood) | Q(visibility=Issue.Visibility.PUBLIC)
    )


def is_resident_of(user, issue: Issue) -> bool:
    """A verified member of the issue's own neighbourhood: the only people who may comment."""
    home = residence_of(user)
    return bool(home and home.neighbourhood_id == issue.neighbourhood_id and home.is_verified)


def can_support(user) -> bool:
    """Anyone with a verified home anywhere. Unverified members cannot vote on anything."""
    home = residence_of(user)
    return bool(home and home.is_verified)


def scope_queryset(user, scope: str):
    """`mine` = my own neighbourhood. `others` = public issues elsewhere, nearest first, within 5 km."""
    queryset = visible_to(user)
    home = residence_of(user)
    if scope == 'others':
        queryset = queryset.filter(visibility=Issue.Visibility.PUBLIC)
        if home:
            queryset = queryset.exclude(neighbourhood=home.neighbourhood)
        return _nearest_first(queryset, home)
    if home:
        queryset = queryset.filter(neighbourhood=home.neighbourhood)
    return list(queryset.order_by('-created_at'))


def _nearest_first(queryset, home):
    """Sort by distance from MY neighbourhood's centre, not from my house: the list must not leak
    where I live, and a neighbourhood centre is already public to its members."""
    if not home:
        return list(queryset.order_by('-created_at'))
    centre = (home.neighbourhood.centre_lat, home.neighbourhood.centre_lng)
    issues = list(queryset.select_related('neighbourhood'))
    within = []
    for issue in issues:
        other = issue.neighbourhood
        metres = distance_m(centre[0], centre[1], other.centre_lat, other.centre_lng)
        if metres <= NEARBY_M:
            within.append((metres, issue))
    within.sort(key=lambda pair: pair[0])
    return [issue for _, issue in within]


def create_issue(user, **fields) -> Issue:
    """The neighbourhood comes from the reporter's home, never from the request."""
    home = residence_of(user)
    if not home:
        raise PermissionError('Add your home before reporting an issue.')
    return Issue.objects.create(neighbourhood=home.neighbourhood, created_by=user, **fields)


def set_status(user, issue: Issue, status: str) -> Issue:
    """The reporter or staff may move an issue along. Followers are told."""
    if issue.created_by_id != user.id and not user.is_staff:
        raise PermissionError('Only the person who reported this can change its status.')
    if status == issue.status:
        return issue
    # Conditional update: two people pressing at once must not both notify.
    changed = Issue.objects.filter(pk=issue.pk, status=issue.status).update(status=status)
    issue.refresh_from_db()
    if changed:
        from .tasks import notify_followers
        notify_followers.delay(issue.pk, status)
    return issue


def share_to_group(user, issue: Issue):
    """Put an issue card in my own neighbourhood's group chat.

    Only a verified resident of the issue's area may share it: otherwise a public issue from
    somewhere else could be pushed into a group that has no connection to it.
    """
    if not is_resident_of(user, issue):
        raise PermissionError('Only a verified neighbour in this area can share it here.')
    from chat.services import post_issue_card
    return post_issue_card(user, issue)
