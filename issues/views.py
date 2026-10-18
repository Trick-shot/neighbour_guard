"""Issues v2. Every rule is in a queryset or a permission, never only in the app."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from places.services import residence_of

from . import services
from .models import Issue, IssueFollow, IssueSupport
from .serializers import (
    IssueCommentSerializer, IssueCreateSerializer, IssueSerializer, IssueStreetSerializer,
)


class IsResidentOfIssueArea(BasePermission):
    """Comments are for the people who live with the problem."""

    message = 'Only a verified neighbour in this issue\'s area can comment.'

    def has_object_permission(self, request, view, obj):
        return services.is_resident_of(request.user, obj)


def _serializer_for(user, issue=None):
    """Unverified members see issues without the reporter's name."""
    home = residence_of(user)
    verified = bool(home and home.is_verified)
    return IssueSerializer if (verified or user.is_staff) else IssueStreetSerializer


class IssueListView(APIView):
    """GET / POST /api/v2/issues/ — `?scope=mine` (default) or `?scope=others`."""

    def get(self, request):
        scope = request.query_params.get('scope', 'mine')
        if scope not in ('mine', 'others'):
            return Response({'detail': 'scope must be mine or others.'}, status=status.HTTP_400_BAD_REQUEST)
        issues = services.scope_queryset(request.user, scope)
        ids = [issue.pk for issue in issues]
        # Re-read with the counts, keeping the order the scope decided.
        annotated = {i.pk: i for i in services.with_counts(Issue.objects.filter(pk__in=ids), request.user)}
        ordered = [annotated[pk] for pk in ids if pk in annotated]
        return Response(_serializer_for(request.user)(ordered, many=True).data)

    def post(self, request):
        serializer = IssueCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            issue = services.create_issue(request.user, **serializer.validated_data)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        full = services.with_counts(Issue.objects.filter(pk=issue.pk), request.user).first()
        return Response(IssueSerializer(full).data, status=status.HTTP_201_CREATED)


class IssueDetailView(APIView):
    """GET / PATCH /api/v2/issues/<id>/. 404 covers "not allowed to know it exists"."""

    def _get(self, request, pk):
        return services.with_counts(services.visible_to(request.user), request.user).filter(pk=pk).first()

    def get(self, request, pk):
        issue = self._get(request, pk)
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serializer_for(request.user, issue)(issue).data)

    def patch(self, request, pk):
        issue = self._get(request, pk)
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in dict(Issue.Status.choices):
            return Response({'detail': 'Only the status can be changed here.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            issue = services.set_status(request.user, issue, new_status)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        full = services.with_counts(Issue.objects.filter(pk=issue.pk), request.user).first()
        return Response(IssueSerializer(full).data)


class IssueSupportView(APIView):
    """POST / DELETE /api/v2/issues/<id>/support/ — "this affects me too"."""

    def post(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not services.can_support(request.user):
            return Response({'detail': 'Your home has to be verified first.'},
                            status=status.HTTP_403_FORBIDDEN)
        IssueSupport.objects.get_or_create(issue=issue, user=request.user)
        return Response({'support_count': issue.supports.count(), 'i_support': True})

    def delete(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        IssueSupport.objects.filter(issue=issue, user=request.user).delete()
        return Response({'support_count': issue.supports.count(), 'i_support': False})


class IssueFollowView(APIView):
    """POST / DELETE /api/v2/issues/<id>/follow/ — be told when the status changes."""

    def post(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not services.can_support(request.user):
            return Response({'detail': 'Your home has to be verified first.'},
                            status=status.HTTP_403_FORBIDDEN)
        IssueFollow.objects.get_or_create(issue=issue, user=request.user)
        return Response({'i_follow': True})

    def delete(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        IssueFollow.objects.filter(issue=issue, user=request.user).delete()
        return Response({'i_follow': False})


class IssueCommentsView(APIView):
    """GET / POST /api/v2/issues/<id>/comments/."""

    permission_classes = APIView.permission_classes + [IsResidentOfIssueArea]

    def get(self, request, pk):
        # Reading comments only needs to see the issue; the permission class guards writing.
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        comments = issue.comments.select_related('author')
        return Response(IssueCommentSerializer(comments, many=True).data)

    def post(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, issue)
        serializer = IssueCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(issue=issue, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class IssueShareView(APIView):
    """POST /api/v2/issues/<id>/share/ — put an issue card in my neighbourhood's group chat."""

    def post(self, request, pk):
        issue = services.visible_to(request.user).filter(pk=pk).first()
        if not issue:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            message = services.share_to_group(request.user, issue)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        return Response({'conversation_id': message.conversation_id, 'message_id': message.pk},
                        status=status.HTTP_201_CREATED)
