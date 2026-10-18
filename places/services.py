"""Business rules for places. Views stay thin and call these functions."""
from collections import Counter

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

from .geo import area_cell, bounding_box, distance_m
from .models import Neighbourhood, Residence, ResidenceMember, Vouch

User = get_user_model()


def residence_of(user):
    """The user's residence, or None. Always from the server's records, never the request."""
    membership = (
        ResidenceMember.objects.select_related('residence__neighbourhood').filter(user=user).first()
    )
    return membership.residence if membership else None


def find_or_create_neighbourhood(lat: float, lng: float, street: str, district: str) -> Neighbourhood:
    """The nearest neighbourhood whose circle contains the point, or a new one centred here."""
    radius = settings.NEIGHBOURHOOD_RADIUS_M
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius * 2)
    candidates = Neighbourhood.objects.filter(
        centre_lat__range=(min_lat, max_lat), centre_lng__range=(min_lng, max_lng)
    )
    best, best_d = None, None
    for n in candidates:
        d = distance_m(lat, lng, n.centre_lat, n.centre_lng)
        if d <= n.radius_m and (best_d is None or d < best_d):
            best, best_d = n, d
    if best:
        return best

    name = district or street or 'Neighbourhood'
    base = slugify(name) or 'neighbourhood'
    slug, i = base, 2
    while Neighbourhood.objects.filter(slug=slug).exists():
        slug, i = f'{base}-{i}', i + 1
    return Neighbourhood.objects.create(name=name, slug=slug, centre_lat=lat, centre_lng=lng, radius_m=radius)


@transaction.atomic
def create_residence(user, *, house_number, street, lat, lng, district='', directions='') -> Residence:
    if ResidenceMember.objects.filter(user=user).exists():
        raise ValueError('You already belong to a residence.')
    neighbourhood = find_or_create_neighbourhood(lat, lng, street, district)
    residence = Residence.objects.create(
        neighbourhood=neighbourhood, house_number=house_number, street=street, district=district,
        directions=directions, lat=lat, lng=lng,
    )
    ResidenceMember.objects.create(residence=residence, user=user, role=ResidenceMember.Role.OWNER)
    # The first home in a new neighbourhood has nobody to vouch for it.
    if not Residence.objects.filter(neighbourhood=neighbourhood, status=Residence.Status.VERIFIED).exists():
        residence.mark_verified()
    _on_residence_joined(user, residence)
    return residence


def _on_residence_joined(user, residence):
    """Hook for other apps (chat adds the user to the neighbourhood group)."""
    from chat.services import add_to_neighbourhood_group

    add_to_neighbourhood_group(user, residence.neighbourhood)


def residences_near(lat: float, lng: float, radius_m: float, exclude_id=None):
    """Residences within radius_m, nearest first, as (residence, distance_m) pairs."""
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius_m)
    qs = Residence.objects.filter(lat__range=(min_lat, max_lat), lng__range=(min_lng, max_lng))
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    pairs = [(r, distance_m(lat, lng, r.lat, r.lng)) for r in qs]
    return sorted([p for p in pairs if p[1] <= radius_m], key=lambda p: p[1])


def users_near(residence: Residence, radius_m: float):
    """Users living within radius_m of a residence, excluding that residence's own members."""
    ids = [r.id for r, _ in residences_near(residence.lat, residence.lng, radius_m, exclude_id=residence.id)]
    return User.objects.filter(residence_membership__residence_id__in=ids, is_active=True)


def areas_for(neighbourhood: Neighbourhood):
    """Approximate areas for the Home map: grid cell centres with a house count, never exact homes."""
    grid = settings.AREA_GRID_DEG
    counts = Counter(
        area_cell(r.lat, r.lng, grid) for r in neighbourhood.residences.only('lat', 'lng')
    )
    return [{'lat': lat, 'lng': lng, 'homes': n} for (lat, lng), n in counts.items()]


def is_verified_member(user, neighbourhood=None) -> bool:
    residence = residence_of(user)
    if not residence or not residence.is_verified:
        return False
    return neighbourhood is None or residence.neighbourhood_id == neighbourhood.id


@transaction.atomic
def vouch(voucher, residence: Residence) -> Residence:
    """A verified neighbour in the same neighbourhood vouches for a pending residence."""
    if not is_verified_member(voucher, residence.neighbourhood):
        raise PermissionError('Only verified neighbours in this area can vouch.')
    if residence.members.filter(user=voucher).exists():
        raise PermissionError('You cannot vouch for your own home.')
    Vouch.objects.get_or_create(residence=residence, voucher=voucher)
    residence = Residence.objects.select_for_update().get(pk=residence.pk)
    if not residence.is_verified and residence.vouches.count() >= Residence.VOUCHES_NEEDED:
        residence.mark_verified()
    return residence
