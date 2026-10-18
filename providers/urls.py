from django.urls import path

from . import views

urlpatterns = [
    path('', views.ProviderListView.as_view(), name='providers'),
    path('plans/<int:pk>/join/', views.JoinPlanView.as_view(), name='plan-join'),
    path('subscriptions/', views.MySubscriptionsView.as_view(), name='my-subscriptions'),
    path('payments/<int:pk>/', views.PaymentView.as_view(), name='payment'),
    path('mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
]
