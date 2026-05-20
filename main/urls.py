from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ResidenceViewSet, ProfileViewSet, IssueViewSet,
    send_alert, get_alerts, resolve_alert, save_push_token, ConversationViewSet
)

router = DefaultRouter()  # ← use DefaultRouter, not SimpleRouter
router.register("residences", ResidenceViewSet, basename="residence")
router.register('profiles', ProfileViewSet, basename="profile")
router.register('issues', IssueViewSet, basename='issue')
router.register(r'conversations', ConversationViewSet, basename='conversations')

urlpatterns = [
    path("alerts/send/", send_alert, name="send-alert"),
    path("alerts/", get_alerts, name="get-alerts"),
    path("alerts/<int:alert_id>/resolve/", resolve_alert, name="resolve-alert"),
    path("users/push-token/", save_push_token, name="save-push-token"),
    path(r'', include(router.urls)),  # ← use router not routers
]
