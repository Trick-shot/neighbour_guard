"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.issues, name='issues')
Class-based views
    1. Add an import:  from other_app.views import issues
    2. Add a URL to urlpatterns:  path('', issues.as_view(), name='issues')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls.static import static
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path

from backend.view import FrontendAppView

urlpatterns = [
    path('api/admin/', admin.site.urls),
    # Auth
    path('api/auth/', include('core.urls')),
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.jwt')),

    # App
    path('api/main/', include('main.urls')),

    # DRF browsable API (dev only)
    path('api-auth/', include('rest_framework.urls')),

]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [re_path(r'^.*$', FrontendAppView.as_view(), name='web')]
