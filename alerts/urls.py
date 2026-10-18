from django.urls import path

from . import views

urlpatterns = [
    path('', views.AlertListCreateView.as_view(), name='alerts'),
    path('safety-pin/', views.SafetyPinView.as_view(), name='safety-pin'),
    path('push-token/', views.PushTokenView.as_view(), name='push-token'),
    path('<int:pk>/', views.AlertDetailView.as_view(), name='alert'),
    path('<int:pk>/cancel/', views.CancelView.as_view(), name='alert-cancel'),
    path('<int:pk>/type/', views.ChangeTypeView.as_view(), name='alert-type'),
    path('<int:pk>/send-now/', views.SendNowView.as_view(), name='alert-send-now'),
    path('<int:pk>/respond/', views.RespondView.as_view(), name='alert-respond'),
    path('<int:pk>/resolve/', views.ResolveView.as_view(), name='alert-resolve'),
]
