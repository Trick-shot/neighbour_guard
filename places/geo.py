"""Small, dependency-free geometry helpers. Accurate enough for distances under ~50 km."""
import math

EARTH_RADIUS_M = 6_371_000


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres (haversine)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def bounding_box(lat: float, lng: float, radius_m: float) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lng, max_lng) of a square around a point.

    Used to let the database discard far-away rows with an indexed range
    query, before the exact (and slower) distance check in Python.
    """
    dlat = radius_m / 111_320
    dlng = radius_m / (111_320 * max(math.cos(math.radians(lat)), 0.01))
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng


def area_cell(lat: float, lng: float, grid_deg: float) -> tuple[float, float]:
    """Centre of the fixed grid cell a point falls in.

    A fixed grid (not random noise) means the same home always maps to the
    same cell, so averaging many responses cannot reveal the exact spot.
    """
    cell_lat = math.floor(lat / grid_deg) * grid_deg + grid_deg / 2
    cell_lng = math.floor(lng / grid_deg) * grid_deg + grid_deg / 2
    return round(cell_lat, 6), round(cell_lng, 6)
