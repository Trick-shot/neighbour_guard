from django.urls import path

from . import views

urlpatterns = [
    path('', views.IssueListView.as_view(), name='issues'),
    path('<int:pk>/', views.IssueDetailView.as_view(), name='issue'),
    path('<int:pk>/support/', views.IssueSupportView.as_view(), name='issue-support'),
    path('<int:pk>/follow/', views.IssueFollowView.as_view(), name='issue-follow'),
    path('<int:pk>/comments/', views.IssueCommentsView.as_view(), name='issue-comments'),
    path('<int:pk>/share/', views.IssueShareView.as_view(), name='issue-share'),
]
