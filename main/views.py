from django.db.models import Count
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from .models import Residence, Issue, IssueComment, CommentLike, Alert, Conversation, Message
from .serializers import ResidenceSerializer, ProfileSerializer, NeighbourResidenceSerializer, UserSerializer, \
    ConversationSerializer, MessageSerializer
from rest_framework.mixins import RetrieveModelMixin, UpdateModelMixin, CreateModelMixin, DestroyModelMixin, \
    ListModelMixin
from django.contrib.auth import get_user_model
from .models import Profile
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from django.db import models
from .serializers import IssueSerializer, IssueCommentSerializer, AlertSerializer
from .utils import get_neighbours_within_radius, send_push_notifications, ALERT_LABELS, CRITICAL_TYPES

User = get_user_model()


@method_decorator(csrf_exempt, name='dispatch')
class ResidenceViewSet(ListModelMixin, RetrieveModelMixin, UpdateModelMixin, CreateModelMixin, DestroyModelMixin,
                       GenericViewSet):
    queryset = Residence.objects.all()
    serializer_class = ResidenceSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.pop("email")
        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"errors": "User with this email not found"}, status=status.HTTP_404_NOT_FOUND)

        if Residence.objects.filter(residence_members=user).exists():
            return Response({"error": "User is already in a residence"}, status=status.HTTP_400_BAD_REQUEST)

        residence = serializer.save()
        residence.residence_members.add(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-residence')
    def my_residence(self, request, *args, **kwargs):
        user = request.user

        residence = Residence.objects.filter(residence_members=user).first()

        if not residence:
            return Response({"errors": "Residence not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(residence)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="neighbours")
    def neighbours(self, request):
        user_residence = Residence.objects.filter(
            residence_members=request.user
        ).select_related("location").first()

        if not user_residence or not user_residence.location:
            return Response({"error": "Your residence location is not set."}, status=400)

        current_location = {
            "latitude": user_residence.location.latitude,
            "longitude": user_residence.location.longitude,
        }

        other_residences = Residence.objects.exclude(
            id=user_residence.id
        ).select_related("location")

        neighbours = get_neighbours_within_radius(current_location, other_residences, radius_meters=30)
        serializer = NeighbourResidenceSerializer(neighbours, many=True, context={'request': request})
        return Response(serializer.data)


class ProfileViewSet(ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['update_profile', 'update_profile']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='my-profile')
    def my_profile(self, request):
        profile = Profile.objects.filter(user=request.user).first()

        if not profile:
            return Response(
                {"errors": "Profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="update-profile")
    def update_profile(self, request, *args, **kwargs):
        email = request.data.get("email")

        if not email:
            return Response({"errors": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"errors": "User with this email not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = Profile.objects.filter(user=user).first()
        if not profile:
            return Response({"errors": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(profile, data=request.data, partial=True)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        print("FILES:", request.FILES)
        print("DATA:", request.data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IssueViewSet(ListModelMixin, RetrieveModelMixin, CreateModelMixin, DestroyModelMixin, GenericViewSet):
    queryset = Issue.objects.all().order_by('-created_at')
    serializer_class = IssueSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        category = self.request.query_params.get('category', None)
        if category:
            return Issue.objects.filter(category=category).order_by('-created_at')
        return Issue.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='add-comment')
    def add_comment(self, request, pk=None):
        issue = self.get_object()
        comment_text = request.data.get('comment')

        if not comment_text:
            return Response(
                {"error": "Comment is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment = IssueComment.objects.create(
            issue=issue,
            user=request.user,
            comment=comment_text
        )
        serializer = IssueCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='like-comment')
    def like_comment(self, request, pk=None):
        comment_id = request.data.get('comment_id')
        comment = IssueComment.objects.filter(id=comment_id).first()

        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        like, created = CommentLike.objects.get_or_create(
            comment=comment,
            user=request.user
        )

        if not created:
            like.delete()
            return Response({"message": "Unliked"}, status=status.HTTP_200_OK)

        return Response({"message": "Liked"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_alert(request):
    user_residence = Residence.objects.filter(
        residence_members=request.user
    ).select_related("location").first()

    if not user_residence or not user_residence.location:
        return Response({"error": "Your residence location is not set."}, status=400)

    alert_type = request.data.get("alert_type", "emergency")
    message = request.data.get("message", "")

    # create alert
    alert = Alert.objects.create(
        sender=request.user,
        residence=user_residence,
        alert_type=alert_type,
        message=message,
    )

    # get neighbours within 30m
    other_residences = Residence.objects.exclude(
        id=user_residence.id
    ).select_related("location").prefetch_related("residence_members")

    current_location = {
        "latitude": user_residence.location.latitude,
        "longitude": user_residence.location.longitude,
    }

    neighbours = get_neighbours_within_radius(current_location, other_residences, radius_meters=30)

    # collect push tokens from all neighbour members
    tokens = [
        member.push_token
        for residence in neighbours
        for member in residence.residence_members.all()
        if member.push_token
    ]

    # send push notifications
    send_push_notifications(
        tokens=tokens,
        title=ALERT_LABELS.get(alert_type, "⚠️ Alert"),
        body=f"{request.user.full_name} from {user_residence.residence_name}: {message or 'Needs your attention!'}",
        data={
            "alert_id": alert.id,
            "alert_type": alert_type,
            "residence_id": user_residence.id,
            "latitude": user_residence.location.latitude,
            "longitude": user_residence.location.longitude,
        }
    )

    serializer = AlertSerializer(alert)
    return Response({
        "alert": serializer.data,
        "notified_count": len(tokens),
    }, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_alerts(request):
    """Get all alerts sent to the current user's neighbourhood"""
    user_residence = Residence.objects.filter(
        residence_members=request.user
    ).select_related("location").first()

    if not user_residence or not user_residence.location:
        return Response({"error": "Your residence location is not set."}, status=400)

    current_location = {
        "latitude": user_residence.location.latitude,
        "longitude": user_residence.location.longitude,
    }

    other_residences = Residence.objects.exclude(
        id=user_residence.id
    ).select_related("location")

    neighbours = get_neighbours_within_radius(current_location, other_residences, radius_meters=30)
    neighbour_ids = [r.id for r in neighbours] + [user_residence.id]

    alerts = Alert.objects.filter(
        residence__id__in=neighbour_ids
    ).select_related("sender", "residence__location")

    serializer = AlertSerializer(alerts, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    """Mark an alert as resolved"""
    try:
        alert = Alert.objects.get(id=alert_id, sender=request.user)
        alert.is_resolved = True
        alert.save()
        return Response({"message": "Alert resolved"})
    except Alert.DoesNotExist:
        return Response({"error": "Alert not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_push_token(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token is required"}, status=400)
    request.user.push_token = token
    request.user.save()
    return Response({"message": "Push token saved successfully"})


# views
class ConversationViewSet(ListModelMixin, CreateModelMixin, RetrieveModelMixin, GenericViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        participant_ids = request.data.get('participant_ids', [])
        conversation_type = request.data.get('conversation_type', 'direct')
        name = request.data.get('name', None)

        participant_ids = [int(pid) for pid in participant_ids]

        print(f"USER ID: {request.user.id}")
        print(f"PARTICIPANT IDS: {participant_ids}")
        print(f"TYPE: {conversation_type}")

        if conversation_type == 'direct' and len(participant_ids) == 1:
            existing = Conversation.objects.filter(
                conversation_type='direct',
                participants=request.user
            ).filter(
                participants__id=participant_ids[0]
            ).annotate(
                participant_count=Count('participants')
            ).filter(
                participant_count=2
            )

            print(f"QUERY: {existing.query}")  # ← prints the actual SQL
            print(f"RESULTS: {list(existing)}")

            existing = existing.first()
            print(f"EXISTING: {existing}")

            if existing:
                serializer = self.get_serializer(existing, context={'request': request})
                return Response(serializer.data, status=200)

        conversation = Conversation.objects.create(
            conversation_type=conversation_type,
            name=name
        )
        conversation.participants.add(request.user, *participant_ids)
        serializer = self.get_serializer(conversation, context={'request': request})
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        conversation = self.get_object()
        msgs = conversation.messages.order_by('created_at')
        serializer = MessageSerializer(msgs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='neighbourhood-group')
    def neighbourhood_group(self, request):
        # get user's residence
        user_residence = Residence.objects.filter(
            residence_members=request.user
        ).select_related('location').first()

        if not user_residence or not user_residence.location:
            return Response({'error': 'Residence location not set'}, status=400)

        # get all neighbours within 30m
        current_location = {
            'latitude': user_residence.location.latitude,
            'longitude': user_residence.location.longitude,
        }
        other_residences = Residence.objects.exclude(
            id=user_residence.id
        ).select_related('location').prefetch_related('residence_members')

        neighbours = get_neighbours_within_radius(current_location, other_residences, radius_meters=30)

        # collect all neighbour user ids
        neighbour_ids = [
            member.id
            for residence in neighbours
            for member in residence.residence_members.all()
        ]

        if not neighbour_ids:
            return Response({'error': 'No neighbours found'}, status=400)

        # check if neighbourhood group already exists
        existing = Conversation.objects.filter(
            conversation_type='group',
            name=f'{user_residence.district} Neighbourhood'
        ).filter(
            participants=request.user
        ).first()

        if existing:
            serializer = self.get_serializer(existing, context={'request': request})
            return Response(serializer.data, status=200)

        # create group with all neighbours
        conversation = Conversation.objects.create(
            conversation_type='group',
            name=f'{user_residence.district} Neighbourhood'
        )
        conversation.participants.add(request.user, *neighbour_ids)
        serializer = self.get_serializer(conversation, context={'request': request})
        return Response(serializer.data, status=201)
