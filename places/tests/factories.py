"""Tiny helpers to build test data. Coordinates are around Masaki, Dar es Salaam."""
from django.contrib.auth import get_user_model

from places import services

User = get_user_model()
MASAKI = (-6.7484, 39.2797)


def user(email, name=None):
    return User.objects.create_user(email=email, password='pw-12345!', full_name=name or email.split('@')[0].title())


def offset(meters_north=0, meters_east=0, origin=MASAKI):
    lat, lng = origin
    return lat + meters_north / 111_320, lng + meters_east / 110_900


def home(u, house='1', street='Masaki St', north=0, east=0, verified=None):
    lat, lng = offset(north, east)
    r = services.create_residence(u, house_number=house, street=street, district='Masaki', lat=lat, lng=lng)
    if verified is True and not r.is_verified:
        r.mark_verified()
    return r
