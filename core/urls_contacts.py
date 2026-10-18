"""/api/v2/contacts/ — emergency contacts (see docs/API-v2.md)."""
from django.urls import path

from . import views

urlpatterns = [
    path('', views.EmergencyContactsView.as_view(), name='contacts'),
    path('<int:pk>/', views.EmergencyContactView.as_view(), name='contact'),
]
