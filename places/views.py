from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Residence, ResidenceMember
from .serializers import (
    MyResidenceSerializer, ResidenceCreateSerializer, ResidenceNeighbourSerializer, ResidencePublicSerializer,
)

User = get_user_model()


class MyResidenceView(APIView):
    """GET / POST / PATCH /api/v2/places/me/ — the caller's own home."""

    def get(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'You have not added your home yet.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(MyResidenceSerializer(residence).data)

    def post(self, request):
        data = ResidenceCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            residence = services.create_residence(request.user, **data.validated_data)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)
        return Response(MyResidenceSerializer(residence).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'You have not added your home yet.'}, status=status.HTTP_404_NOT_FOUND)
        # Moving the pin changes who gets your alerts, so only these text fields are editable here.
        allowed = {k: v for k, v in request.data.items() if k in ('house_number', 'street', 'directions')}
        serializer = MyResidenceSerializer(residence, data=allowed, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AreasView(APIView):
    """GET /api/v2/places/areas/ — approximate areas of the caller's neighbourhood for the Home map."""

    def get(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'Add your home first.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'neighbourhood': residence.neighbourhood.name,
            'areas': services.areas_for(residence.neighbourhood),
        })


class NeighboursView(APIView):
    """GET /api/v2/places/neighbours/ — people in the caller's neighbourhood.

    Verified viewers see house numbers; unverified viewers see streets only.
    Nobody sees distances or coordinates here.
    """

    def get(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'Add your home first.'}, status=status.HTTP_404_NOT_FOUND)
        verified_viewer = residence.is_verified
        home_serializer = ResidenceNeighbourSerializer if verified_viewer else ResidencePublicSerializer
        members = (
            ResidenceMember.objects.filter(residence__neighbourhood=residence.neighbourhood)
            .exclude(user=request.user)
            .select_related('user', 'residence')
            .order_by('-residence__status', 'residence__street', 'residence__house_number')
        )
        return Response([
            {'user_id': m.user_id, 'full_name': m.user.full_name, 'home': home_serializer(m.residence).data}
            for m in members
        ])


class VouchView(APIView):
    """POST /api/v2/places/residences/<id>/vouch/"""

    def post(self, request, pk):
        residence = get_object_or_404(Residence, pk=pk)
        try:
            residence = services.vouch(request.user, residence)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        return Response({'status': residence.status, 'vouches': residence.vouches.count()})
