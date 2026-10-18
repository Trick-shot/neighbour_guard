"""Neighbourhood issues: the slow problems, as opposed to the SOS emergencies.

A broken street light, a dark alley, a water leak. The rules that matter here are about who may see
and say what, and they live in `services.visible_to` and the permission classes — never only in the
app (see docs/reference/backend.md, "Issues").
"""
from django.conf import settings
from django.db import models


class Issue(models.Model):
    class Category(models.TextChoices):
        SECURITY = 'security', 'Security'
        LIGHTING = 'lighting', 'Street lighting'
        ROADS = 'roads', 'Roads and drainage'
        WATER = 'water', 'Water'
        WASTE = 'waste', 'Waste'
        OTHER = 'other', 'Other'

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MODERATE = 'moderate', 'Moderate'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'Being dealt with'
        RESOLVED = 'resolved', 'Resolved'

    class Visibility(models.TextChoices):
        NEIGHBOURHOOD = 'neighbourhood', 'My neighbourhood only'
        PUBLIC = 'public', 'Anyone nearby'

    # Set by the server from the reporter's own residence, never from the request body.
    neighbourhood = models.ForeignKey('places.Neighbourhood', on_delete=models.CASCADE, related_name='issues')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issues_v2')
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=12, choices=Category.choices, default=Category.OTHER)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.LOW)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    visibility = models.CharField(max_length=14, choices=Visibility.choices, default=Visibility.NEIGHBOURHOOD)
    # Where the problem is — not where the reporter lives. Coarse by nature: a street light, not a door.
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['neighbourhood', 'status'])]

    def __str__(self):
        return self.title


class IssueMedia(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='media')
    image = models.ImageField(upload_to='issues/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']


class IssueComment(models.Model):
    """Only verified residents of the issue's own area may add one (IsResidentOfIssueArea)."""

    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issue_comments')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']


class IssueSupport(models.Model):
    """"This affects me too." One per person per issue."""

    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='supports')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issue_supports')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['issue', 'user'], name='one_support_per_person')]


class IssueFollow(models.Model):
    """Told when the status changes."""

    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='follows')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issue_follows')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['issue', 'user'], name='one_follow_per_person')]
