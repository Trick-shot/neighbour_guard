"""Settings for the test suite: SQLite, in-memory channels and cache, no network."""
import os

os.environ.setdefault('SECRET_KEY', 'test-only-not-secret-0123456789abcdef0123456789')
os.environ.setdefault('DB_ENGINE', 'django.db.backends.sqlite3')
os.environ.setdefault('DB_NAME', ':memory:')
os.environ.setdefault('CACHE_BACKEND', 'django.core.cache.backends.locmem.LocMemCache')

from .settings import *  # noqa: E402,F401,F403

CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CELERY_TASK_ALWAYS_EAGER = False
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
CELERY_BROKER_URL = 'memory://'
