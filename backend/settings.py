"""
NeighbourGuard settings.

Every secret and every environment-specific value comes from the environment
(.env via python-decouple). Defaults exist only where a safe local default
exists, so a missing production secret fails loudly instead of silently.
"""
import os
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'djoser',
    'channels',
    # v1 apps (kept while the old mobile app is still in use)
    'core.apps.CoreConfig',
    'main',
    # v2 apps (the rebuild, see docs/reference/backend.md)
    'places.apps.PlacesConfig',
    'alerts.apps.AlertsConfig',
    'chat.apps.ChatConfig',
    'issues.apps.IssuesConfig',
]

ASGI_APPLICATION = 'backend.asgi.application'
WSGI_APPLICATION = 'backend.wsgi.application'
ROOT_URLCONF = 'backend.urls'
AUTH_USER_MODEL = 'core.User'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # Defence in depth, not a fix for a known hole: the admin already wraps each of its own views
    # in csrf_protect, and every API endpoint is a DRF view, which DRF makes csrf_exempt. This
    # catches any future session-authenticated view that forgets to protect itself, and it makes
    # `manage.py check --deploy` clean so a real warning stands out.
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates', BASE_DIR / 'staticfiles'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# --- Database ---------------------------------------------------------------
# Production sets DB_ENGINE=django.db.backends.mysql and the DB_* values.
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.db.backends.sqlite3'),
        'NAME': config('DB_NAME', default=str(BASE_DIR / 'db.sqlite3')),
        'USER': config('DB_USER', default=''),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default=''),
        'PORT': config('DB_PORT', default=''),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static and media -------------------------------------------------------
STATIC_URL = '/static/'
STATICFILES_DIRS = [d for d in [BASE_DIR / 'web' / 'dist'] if d.exists()]
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- CORS / CSRF -------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

# --- HTTPS ------------------------------------------------------------------
# Off by default, so a host without a working certificate cannot redirect-loop itself. Turn these
# on with HTTPS=True once TLS actually serves the domain (see docs/DEPLOY.md), and not before.
HTTPS = config('HTTPS', default=False, cast=bool)
if HTTPS:
    # nginx terminates TLS, so Django has to be told what the forwarded request looked like.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # One hour to start. Raise it only when every subdomain can do HTTPS: browsers remember HSTS
    # and there is no quick way back.
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=3600, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# --- Email --------------------------------------------------------------------
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.mail.yahoo.com')
EMAIL_PORT = config('EMAIL_PORT', default=465, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=True, cast=bool)
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER or 'no-reply@neighbourguard.app'
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# --- SMS (Africa's Talking) ---------------------------------------------------
# The SDK is initialised lazily in core/sms.py, so tests and local runs do not
# need real credentials.
AFRICASTALKING_USERNAME = config('AFRICASTALKING_USERNAME', default='')
AFRICASTALKING_API_KEY = config('AFRICASTALKING_API_KEY', default='')
# Shared secret in the inbound-SMS callback URL. Africa's Talking does not sign its callbacks, and
# that endpoint can raise an alert without a login, so with no secret set it refuses everything.
SMS_INBOUND_SECRET = config('SMS_INBOUND_SECRET', default='')
# The number people text an SOS to when they have no data. Shown on the SMS fallback screen.
SMS_SHORTCODE = config('SMS_SHORTCODE', default='')

# --- DRF / JWT ----------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_RATES': {
        # SMS costs money and can be abused: keep these tight.
        'otp_send': '3/10min',
        'otp_verify': '10/10min',
        'email_code': '10/10min',
    },
}

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('JWT',),
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

DJOSER = {
    'SEND_ACTIVATION_EMAIL': True,
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'DOMAIN': config('DOMAIN', default='localhost'),
    'PROTOCOL': config('PROTOCOL', default='http'),
    'SITE_NAME': 'NeighbourGuard',
    'SERIALIZERS': {
        'user_create': 'core.serializers.UserCreateSerializer',
        'current_user': 'core.serializers.UserSerializer',
    },
}

# --- Redis, Channels, Celery ------------------------------------------------
REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/0')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [REDIS_URL]},
    },
}

CACHES = {
    'default': {
        'BACKEND': config('CACHE_BACKEND', default='django.core.cache.backends.redis.RedisCache'),
        'LOCATION': REDIS_URL,
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_TIME_LIMIT = 60
CELERY_BEAT_SCHEDULE = {
    # Safety net for the SOS countdown: sends any pending alert whose send_at
    # has passed, in case a worker died before its scheduled task ran.
    'sweep-due-alerts': {
        'task': 'alerts.tasks.sweep_due_alerts',
        'schedule': 15.0,
    },
    # Uploads that never reached a message would otherwise sit on disk for ever.
    'delete-unused-attachments': {
        'task': 'chat.tasks.delete_unused_attachments',
        'schedule': 24 * 60 * 60.0,
    },
}

# --- NeighbourGuard product settings ---------------------------------------
SOS_COUNTDOWN_SECONDS = 10
SOS_RADIUS_M = 500
SOS_WIDEN_AFTER_SECONDS = 120
SOS_WIDEN_RADIUS_M = 1000
NEIGHBOURHOOD_RADIUS_M = 500
AREA_GRID_DEG = 0.0015  # roughly 165 m: the "approximate area" cell size
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

# --- Logging ------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': config('LOG_LEVEL', default='INFO')},
}
