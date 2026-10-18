from django.test import TestCase
from rest_framework.test import APITestCase

from chat.models import Participant
from places import services
from places.geo import area_cell, distance_m
from places.models import Residence

from .factories import home, offset, user


class GeoTests(TestCase):
    def test_distance_is_about_right(self):
        lat2, lng2 = offset(meters_north=500)
        self.assertAlmostEqual(distance_m(*offset(), lat2, lng2), 500, delta=5)

    def test_area_cell_is_stable(self):
        a = area_cell(-6.74841, 39.27971, 0.0015)
        b = area_cell(-6.74845, 39.27969, 0.0015)
        self.assertEqual(a, b)


class ResidenceRulesTests(TestCase):
    def test_first_home_founds_a_verified_neighbourhood_and_joins_its_group(self):
        u = user('a@x.tz')
        r = home(u)
        self.assertTrue(r.is_verified)
        self.assertTrue(Participant.objects.filter(user=u, conversation__neighbourhood=r.neighbourhood).exists())

    def test_nearby_home_joins_the_same_neighbourhood_and_waits_for_vouches(self):
        first = home(user('a@x.tz'))
        second = home(user('b@x.tz'), house='2', north=200)
        self.assertEqual(first.neighbourhood_id, second.neighbourhood_id)
        self.assertEqual(second.status, Residence.Status.PENDING)

    def test_far_home_founds_another_neighbourhood(self):
        first = home(user('a@x.tz'))
        far = home(user('b@x.tz'), north=3000)
        self.assertNotEqual(first.neighbourhood_id, far.neighbourhood_id)

    def test_one_home_per_user(self):
        u = user('a@x.tz')
        home(u)
        with self.assertRaises(ValueError):
            home(u, house='2')

    def test_two_vouches_verify_a_home(self):
        home(user('a@x.tz'))
        v1 = user('v1@x.tz')
        home(v1, house='3', north=50, verified=True)
        v2 = user('v2@x.tz')
        home(v2, house='4', north=80, verified=True)
        newcomer = home(user('n@x.tz'), house='5', north=100)
        services.vouch(v1, newcomer)
        self.assertFalse(Residence.objects.get(pk=newcomer.pk).is_verified)
        services.vouch(v2, newcomer)
        self.assertTrue(Residence.objects.get(pk=newcomer.pk).is_verified)

    def test_unverified_neighbours_cannot_vouch(self):
        home(user('a@x.tz'))
        pending = user('p@x.tz')
        home(pending, house='2', north=40)
        newcomer = home(user('n@x.tz'), house='3', north=60)
        with self.assertRaises(PermissionError):
            services.vouch(pending, newcomer)

    def test_users_near_respects_the_radius(self):
        centre = home(user('a@x.tz'))
        home(user('near@x.tz'), house='2', north=300)
        home(user('far@x.tz'), house='3', north=800)
        emails = set(services.users_near(centre, 500).values_list('email', flat=True))
        self.assertEqual(emails, {'near@x.tz'})


class PlacesApiTests(APITestCase):
    def test_create_and_read_my_home(self):
        u = user('a@x.tz')
        self.client.force_authenticate(u)
        lat, lng = offset()
        r = self.client.post('/api/v2/places/me/', {'house_number': '109', 'street': 'Masaki St', 'lat': lat, 'lng': lng})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.client.get('/api/v2/places/me/').data['house_number'], '109')

    def test_cannot_move_the_pin_with_patch(self):
        u = user('a@x.tz')
        r = home(u)
        self.client.force_authenticate(u)
        self.client.patch('/api/v2/places/me/', {'lat': 0, 'lng': 0, 'street': 'Hekima St'}, format='json')
        r.refresh_from_db()
        self.assertNotEqual(r.lat, 0)
        self.assertEqual(r.street, 'Hekima St')

    def test_areas_never_contain_exact_coordinates(self):
        u = user('a@x.tz')
        r = home(u)
        self.client.force_authenticate(u)
        areas = self.client.get('/api/v2/places/areas/').data['areas']
        self.assertEqual(sum(a['homes'] for a in areas), 1)
        self.assertNotIn((r.lat, r.lng), [(a['lat'], a['lng']) for a in areas])

    def test_unverified_viewer_sees_streets_not_house_numbers(self):
        home(user('a@x.tz', 'Asha'), house='109')
        viewer = user('p@x.tz')
        home(viewer, house='2', north=40)
        self.client.force_authenticate(viewer)
        data = self.client.get('/api/v2/places/neighbours/').data
        self.assertEqual(data[0]['full_name'], 'Asha')
        self.assertNotIn('house_number', data[0]['home'])

    def test_verified_viewer_sees_house_numbers_but_no_coordinates(self):
        viewer = user('a@x.tz')
        home(viewer)
        home(user('b@x.tz'), house='110', north=40)
        self.client.force_authenticate(viewer)
        h = self.client.get('/api/v2/places/neighbours/').data[0]['home']
        self.assertEqual(h['house_number'], '110')
        self.assertNotIn('lat', h)


class ImportV1Tests(TestCase):
    def test_import_is_idempotent(self):
        from django.core.management import call_command
        from main.models import Location, Residence as V1

        u = user('old@x.tz')
        old = V1.objects.create(house_number=12, street_name='Masaki St', district='Masaki',
                                location=Location.objects.create(latitude=-6.7484, longitude=39.2797))
        old.residence_members.add(u)
        call_command('import_v1_residences', stdout=open('/dev/null', 'w'))
        call_command('import_v1_residences', stdout=open('/dev/null', 'w'))
        self.assertEqual(Residence.objects.count(), 1)
        self.assertEqual(services.residence_of(u).house_number, '12')


class SeedDemoTests(TestCase):
    def test_seed_is_idempotent(self):
        from django.core.management import call_command
        call_command('seed_demo', stdout=open('/dev/null', 'w'))
        call_command('seed_demo', stdout=open('/dev/null', 'w'))
        self.assertEqual(Residence.objects.count(), 2)
        self.assertEqual(Residence.objects.values('neighbourhood').distinct().count(), 1)
