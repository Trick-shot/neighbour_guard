from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from .models import Residence
from .serializers import ResidenceSerializer, ProfileSerializer
from rest_framework.mixins import RetrieveModelMixin, UpdateModelMixin, CreateModelMixin, DestroyModelMixin, \
    ListModelMixin
from django.contrib.auth import get_user_model
from .models import Profile
from rest_framework.permissions import IsAuthenticated

User = get_user_model()


class ResidenceViewSet(ListModelMixin, RetrieveModelMixin, UpdateModelMixin, CreateModelMixin, DestroyModelMixin,
                       GenericViewSet):
    queryset = Residence.objects.all()
    serializer_class = ResidenceSerializer
    permission_classes = [IsAuthenticated]

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


class ProfileViewSet(ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

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
    def update_proifle(self, request, *args, **kwargs):
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
        return Response(serializer.data, status=status.HTTP_200_OK)
