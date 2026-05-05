from django.urls import include, path
from rest_framework_nested import routers
from .views import ResidenceViewSet

routers = routers.SimpleRouter()
routers.register("Residences", ResidenceViewSet)

urlpatterns = [
    path(r'', include(routers.urls)),
]
