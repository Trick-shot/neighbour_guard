"""Run the whole backend on a laptop with nothing else installed: no MySQL, no Redis, no worker.

    DJANGO_SETTINGS_MODULE=backend.settings_local python manage.py migrate
    DJANGO_SETTINGS_MODULE=backend.settings_local python manage.py seed_showcase
    DJANGO_SETTINGS_MODULE=backend.settings_local python manage.py runserver 0.0.0.0:8000

What is different from the real thing, so nothing here surprises you:
- SQLite file `db_local.sqlite3` (git-ignored), whatever DB_* your .env says.
- Celery tasks run inline. So an SOS goes out the moment the hold ends: the 10 s countdown screen
  still shows, but "cancel" is too late. Use Redis + a worker (see CLAUDE.md) to see the real timing.
- Emails (sign-in codes) are printed in this terminal instead of sent.
- Sockets and cache live in memory: one process only, which `runserver` is.
"""
import os

os.environ['DB_ENGINE'] = 'django.db.backends.sqlite3'
os.environ['CACHE_BACKEND'] = 'django.core.cache.backends.locmem.LocMemCache'

from .settings import *  # noqa: E402,F401,F403
from .settings import BASE_DIR  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = ['*']                 # the phone reaches the laptop by its LAN address
CORS_ALLOW_ALL_ORIGINS = True         # the browser preview runs on another port
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': str(BASE_DIR / 'db_local.sqlite3')}}
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEV_SHOW_CODES = True               # phone codes printed here when no SMS is configured
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = False  # a failed push (no network) must not fail the request
CELERY_BROKER_URL = 'memory://'
