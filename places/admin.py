from django.contrib import admin

from .models import HouseholdPerson, Neighbourhood, Residence, ResidenceMember, Vouch

admin.site.register([Neighbourhood, Residence, ResidenceMember, HouseholdPerson, Vouch])
