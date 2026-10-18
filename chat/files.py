"""What an attachment is allowed to be, and how we know.

The client's `Content-Type` is a claim, not a fact: anyone can upload an executable labelled
`image/jpeg`. So the bytes are sniffed here and the claim is ignored. Limits come from
docs/reference/backend.md.
"""
from dataclasses import dataclass

from .models import Attachment

MB = 1024 * 1024


@dataclass(frozen=True)
class Rule:
    kind: str
    max_bytes: int
    mimes: tuple[str, ...]


RULES = {
    Attachment.Kind.PHOTO: Rule(Attachment.Kind.PHOTO, 10 * MB, ('image/jpeg', 'image/png', 'image/webp')),
    Attachment.Kind.VOICE: Rule(Attachment.Kind.VOICE, 10 * MB, ('audio/mp4', 'audio/mpeg', 'audio/aac',
                                                                 'audio/ogg', 'audio/wav')),
    Attachment.Kind.VIDEO: Rule(Attachment.Kind.VIDEO, 50 * MB, ('video/mp4', 'video/quicktime')),
    Attachment.Kind.FILE: Rule(Attachment.Kind.FILE, 20 * MB, ('application/pdf', 'text/plain',
                                                               'application/msword',
                                                               'application/vnd.openxmlformats-officedocument'
                                                               '.wordprocessingml.document')),
}

VOICE_MAX_SECONDS = 5 * 60  # the reference's "voice 5 min"

# Magic bytes, enough to tell apart everything we accept. (offset, bytes, mime)
SIGNATURES: list[tuple[int, bytes, str]] = [
    (0, b'\xff\xd8\xff', 'image/jpeg'),
    (0, b'\x89PNG\r\n\x1a\n', 'image/png'),
    (0, b'%PDF-', 'application/pdf'),
    (0, b'\xd0\xcf\x11\xe0', 'application/msword'),       # old .doc (OLE2)
    (0, b'PK\x03\x04', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    (0, b'ID3', 'audio/mpeg'),
    (0, b'OggS', 'audio/ogg'),
    (0, b'\xff\xfb', 'audio/mpeg'),
    (0, b'\xff\xf1', 'audio/aac'),
]


def sniff(head: bytes) -> str | None:
    """The real media type from the first bytes, or None when we do not recognise it."""
    for offset, magic, mime in SIGNATURES:
        if head[offset:offset + len(magic)] == magic:
            return mime
    # RIFF containers carry their real type at byte 8: WEBP or WAVE.
    if head[:4] == b'RIFF':
        if head[8:12] == b'WEBP':
            return 'image/webp'
        if head[8:12] == b'WAVE':
            return 'audio/wav'
    # ISO base media (MP4 / M4A / MOV): 'ftyp' at byte 4, then the brand.
    if head[4:8] == b'ftyp':
        brand = head[8:12]
        if brand in (b'qt  ',):
            return 'video/quicktime'
        if brand.startswith(b'M4A'):
            return 'audio/mp4'
        return 'video/mp4'
    return None


class Rejected(Exception):
    """The upload is not something we accept. The message is shown to the user."""


def check(upload, kind: str, duration_s: int | None) -> str:
    """Validate an upload and return its real media type. Raises `Rejected` with a reason."""
    rule = RULES.get(kind)
    if rule is None:
        raise Rejected('That kind of attachment is not supported.')
    if upload.size is None or upload.size <= 0:
        raise Rejected('That file is empty.')
    if upload.size > rule.max_bytes:
        raise Rejected(f'{rule.kind.title()} files have to be under {rule.max_bytes // MB} MB.')

    head = upload.read(32)
    upload.seek(0)
    mime = sniff(head)
    if mime is None:
        raise Rejected('We cannot tell what that file is, so we will not store it.')
    if mime not in rule.mimes:
        # Plain text has no magic bytes, so it is allowed through only as a document.
        if kind == Attachment.Kind.FILE and mime is None:
            return 'text/plain'
        raise Rejected(f'That file is a {mime}, which is not allowed as a {rule.kind}.')
    if kind == Attachment.Kind.VOICE and (duration_s or 0) > VOICE_MAX_SECONDS:
        raise Rejected('Voice notes have to be under 5 minutes.')
    return mime
