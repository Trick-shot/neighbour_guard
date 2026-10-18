from django.urls import path

from . import views

urlpatterns = [
    path('me/', views.MyResidenceView.as_view(), name='my-residence'),
    path('areas/', views.AreasView.as_view(), name='areas'),
    path('neighbours/', views.NeighboursView.as_view(), name='neighbours'),
    path('household/', views.HouseholdView.as_view(), name='household'),
    path('household/<int:pk>/', views.HouseholdMemberView.as_view(), name='household-member'),
    path('residences/<int:pk>/vouch/', views.VouchView.as_view(), name='vouch'),
]
