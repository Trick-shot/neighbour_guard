from django.urls import include, path
from rest_framework_nested import routers
from .views import ResidenceViewSet, ProfileViewSet

routers = routers.SimpleRouter()
routers.register("residences", ResidenceViewSet, basename="residence")
routers.register('profiles', ProfileViewSet, basename="profile")

urlpatterns = [
    path(r'', include(routers.urls)),
]
