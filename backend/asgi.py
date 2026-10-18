import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.core.asgi import get_asgi_application  # noqa: E402

from chat.routing import websocket_urlpatterns as v2_ws  # noqa: E402
from main.routing import websocket_urlpatterns as v1_ws  # noqa: E402

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    # Both consumers authenticate on their own (v1: JWT in the query, v2: one-time ticket).
    # No Origin check: native apps do not send a browser Origin header.
    'websocket': URLRouter(v2_ws + v1_ws),
})
