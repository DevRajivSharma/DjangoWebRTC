"""
ASGI config for Have_It project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""
import os

from channels.routing import ProtocolTypeRouter,URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
import videoconferencing.routing


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Have_It.settings')
# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # Just HTTP for now. (We can add other protocols later.)
    "websocket" : AuthMiddlewareStack(
        URLRouter(
            videoconferencing.routing.websocket_urlpatterns
        )
    )
})