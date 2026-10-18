from django.urls import path

from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='conversations'),
    path('conversations/<int:pk>/messages/', views.MessageListView.as_view(), name='messages'),
    path('attachments/', views.AttachmentView.as_view(), name='attachments'),
    path('ticket/', views.TicketView.as_view(), name='ws-ticket'),
]
