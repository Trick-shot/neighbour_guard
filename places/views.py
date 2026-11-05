from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import HouseholdPerson, Residence, ResidenceMember, Vouch
from .serializers import (
    HouseholdPersonSerializer, MyResidenceSerializer, ResidenceCreateSerializer, ResidenceNeighbourSerializer,
    ResidencePublicSerializer,
)

User = get_user_model()


class GatePhotoView(APIView):
    """POST /api/v2/places/me/gate-photo/ (multipart `photo`) — a photo of my own gate.

    Always my own home (from the token). Responders see it during a live alert from that home;
    the neighbour and public serializers never include it.
    """
    MAX_BYTES = 5 * 1024 * 1024

    def post(self, request):
        import secrets

        from chat.files import sniff
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'Pin your home first.'}, status=status.HTTP_404_NOT_FOUND)
        upload = request.FILES.get('photo')
        if upload is None:
            return Response({'detail': 'Choose a photo.'}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > self.MAX_BYTES:
            return Response({'detail': 'That photo is over 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        head = upload.read(32)
        upload.seek(0)
        if sniff(head) not in ('image/jpeg', 'image/png', 'image/webp'):
            return Response({'detail': 'Use a JPEG, PNG or WebP photo.'}, status=status.HTTP_400_BAD_REQUEST)
        if residence.gate_photo:
            residence.gate_photo.delete(save=False)
        residence.gate_photo.save(f'{residence.pk}-{secrets.token_hex(6)}.img', upload, save=True)
        return Response(MyResidenceSerializer(residence, context={'request': request}).data)


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
        allowed = {k: v for k, v in request.data.items() if k in ('house_number', 'street', 'directions', 'map_visibility')}
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
        mine = set(Vouch.objects.filter(voucher=request.user).values_list('residence_id', flat=True))
        return Response([
            {'user_id': m.user_id, 'full_name': m.user.full_name, 'photo_url': _photo_url(m.user, request),
             'home': home_serializer(m.residence).data,
             'vouches': m.residence.vouches.count(), 'i_vouched': m.residence_id in mine}
            for m in members
        ])


def _photo_url(user, request):
    from main.models import Profile
    profile = Profile.objects.filter(user=user).only('profile_pic').first()
    if not (profile and profile.profile_pic):
        return None
    return request.build_absolute_uri(profile.profile_pic.url)


class NeighbourDetailView(APIView):
    """GET /api/v2/places/neighbours/<user_id>/ — one neighbour's profile (Figma "Neighbour profile").

    Same neighbourhood only (404 otherwise, so it does not confirm that anyone else exists). The
    house number follows the same rule as the list. Never the household, the phone or the pin:
    those are for responders to a live alert only.
    """

    def get(self, request, user_id):
        from core.models import SafetyProfile
        mine = services.residence_of(request.user)
        member = (ResidenceMember.objects.select_related('user', 'residence')
                  .filter(user_id=user_id, residence__neighbourhood=getattr(mine, 'neighbourhood', None)).first())
        if not mine or not member or member.user_id == request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        home_serializer = ResidenceNeighbourSerializer if mine.is_verified else ResidencePublicSerializer
        vouchers = [v.voucher.full_name for v in member.residence.vouches.select_related('voucher')]
        sp = SafetyProfile.objects.filter(user=member.user).first()
        return Response({
            'user_id': member.user_id, 'full_name': member.user.full_name, 'photo_url': _photo_url(member.user, request),
            'home': home_serializer(member.residence).data, 'neighbourhood': mine.neighbourhood.name,
            'vouched_by': vouchers, 'vouches_needed': Residence.VOUCHES_NEEDED,
            'i_vouched': member.residence.vouches.filter(voucher=request.user).exists(),
            'skills': sp.skills if sp else [],
        })


class VouchView(APIView):
    """POST /api/v2/places/residences/<id>/vouch/"""

    def post(self, request, pk):
        residence = get_object_or_404(Residence, pk=pk)
        try:
            residence = services.vouch(request.user, residence)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        return Response({'status': residence.status, 'vouches': residence.vouches.count()})


class HouseholdView(APIView):
    """GET / POST /api/v2/places/household/ — the people in the caller's own home.

    Responders to a live alert from this home see this list; nobody else ever does (see
    ResidenceResponderSerializer). It is written here so a responder knows there is a child or
    someone who cannot move by themselves before they arrive.
    """

    MAX_PEOPLE = 12  # a household, not a directory

    def get(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'Add your home first.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(HouseholdPersonSerializer(residence.household.order_by('id'), many=True).data)

    def post(self, request):
        residence = services.residence_of(request.user)
        if not residence:
            return Response({'detail': 'Add your home first.'}, status=status.HTTP_404_NOT_FOUND)
        if residence.household.count() >= self.MAX_PEOPLE:
            return Response({'detail': f'A home can list {self.MAX_PEOPLE} people.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = HouseholdPersonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # The residence comes from the caller's membership, never from the request body.
        serializer.save(residence=residence)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HouseholdMemberView(APIView):
    """PATCH / DELETE /api/v2/places/household/<id>/ — one person in the caller's own home."""

    def _get(self, request, pk):
        residence = services.residence_of(request.user)
        if not residence:
            return None
        # Scoped to the caller's residence, so another home's household is a 404, not a 403:
        # you may not know it exists.
        return HouseholdPerson.objects.filter(pk=pk, residence=residence).first()

    def patch(self, request, pk):
        person = self._get(request, pk)
        if not person:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = HouseholdPersonSerializer(person, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        person = self._get(request, pk)
        if not person:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        person.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationsView(APIView):
    """GET /api/v2/notifications/?kind=alerts — my feed, newest first, with the unread count."""

    def get(self, request):
        from .feed import feed_for
        items = feed_for(request.user)
        if request.query_params.get('kind') == 'alerts':
            items = [i for i in items if i['kind'] == 'alert']
        return Response({'unread': sum(1 for i in items if i['unread']), 'items': items})


class NotificationsSeenView(APIView):
    """POST /api/v2/notifications/seen/ — everything up to now is read."""

    def post(self, request):
        from django.utils import timezone
        request.user.notifications_seen_at = timezone.now()
        request.user.save(update_fields=['notifications_seen_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
