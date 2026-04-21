from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from .models import Residence
from .serializers import ResidenceSerializer


# Create your views here.
class ResidenceViewSet(ModelViewSet):
    queryset = Residence.objects.all()
    serializer_class = ResidenceSerializer
   