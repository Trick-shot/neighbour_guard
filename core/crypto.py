"""Encryption at rest for medical notes.

Fernet (AES-128-CBC + HMAC) with a key from `MEDICAL_NOTES_KEY`. When that setting is empty the
key is derived from SECRET_KEY, which works but ties the notes to that secret: rotating
SECRET_KEY without setting MEDICAL_NOTES_KEY first makes old notes unreadable (they read as
empty, never as an error). Set MEDICAL_NOTES_KEY on the server — see docs/DEPLOY.md.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    key = getattr(settings, 'MEDICAL_NOTES_KEY', '') or ''
    if not key:
        key = base64.urlsafe_b64encode(hashlib.sha256(('medical-notes:' + settings.SECRET_KEY).encode()).digest()).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(text: str) -> str:
    return _fernet().encrypt(text.encode()).decode() if text else ''


def decrypt(token: str) -> str:
    if not token:
        return ''
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return ''
