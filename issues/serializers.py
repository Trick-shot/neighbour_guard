"""One serializer per audience, as everywhere else: a field that is not here cannot leak."""
from rest_framework import serializers

from .models import Issue, IssueComment, IssueMedia


class IssueMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueMedia
        fields = ['id', 'image']


class IssueCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = IssueComment
        fields = ['id', 'body', 'author_id', 'author_name', 'created_at']
        read_only_fields = ['id', 'author_id', 'author_name', 'created_at']


class IssueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        # No `neighbourhood` and no `created_by`: both come from the signed-in user's own home.
        fields = ['title', 'description', 'category', 'severity', 'visibility', 'lat', 'lng']


class IssueSerializer(serializers.ModelSerializer):
    """What a member of the issue's own area sees."""
    reporter_name = serializers.CharField(source='created_by.full_name', read_only=True)
    neighbourhood_name = serializers.CharField(source='neighbourhood.name', read_only=True)
    support_count = serializers.IntegerField(read_only=True, default=0)
    comment_count = serializers.IntegerField(read_only=True, default=0)
    i_support = serializers.BooleanField(read_only=True, default=False)
    i_follow = serializers.BooleanField(read_only=True, default=False)
    media = IssueMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Issue
        fields = ['id', 'title', 'description', 'category', 'severity', 'status', 'visibility',
                  'lat', 'lng', 'created_at', 'updated_at', 'reporter_name', 'created_by',
                  'neighbourhood', 'neighbourhood_name', 'support_count', 'comment_count',
                  'i_support', 'i_follow', 'media']


class IssueStreetSerializer(IssueSerializer):
    """For an unverified member: the same issue with the reporter's name withheld.

    An unverified member has not been vouched for by anybody, so they do not get to learn which
    named neighbour reported what.
    """
    reporter_name = serializers.SerializerMethodField()

    def get_reporter_name(self, obj):
        return None
