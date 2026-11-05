from django.urls import path

from . import views

urlpatterns = [
    path('', views.NotificationsView.as_view(), name='notifications'),
    path('seen/', views.NotificationsSeenView.as_view(), name='notifications-seen'),
]
