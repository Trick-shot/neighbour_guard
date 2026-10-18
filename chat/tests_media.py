"""Chat attachments: the limits and the type check (docs/reference/backend.md, "To build — media")."""
from datetime import timedelta
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from chat.files import MB
from chat.models import Attachment, Message
from chat.services import save_message
from chat.tasks import delete_unused_attachments
from places.tests.factories import home, user

JPEG = b'\xff\xd8\xff\xe0' + b'\x00' * 64
PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 64
PDF = b'%PDF-1.7' + b'\x00' * 64
MP4 = b'\x00\x00\x00\x18ftypisom' + b'\x00' * 64
EXE = b'MZ\x90\x00' + b'\x00' * 64


def upload(name, content):
    return SimpleUploadedFile(name, content)


class AttachmentUploadTests(APITestCase):
    def setUp(self):
        self.me = user('me@x.tz')
        home(self.me)
        self.client.force_authenticate(self.me)

    def test_a_photo_is_accepted_and_its_type_comes_from_the_bytes(self):
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'photo', 'file': upload('a.jpg', JPEG)}, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['mime'], 'image/jpeg')
        self.assertEqual(Attachment.objects.get(pk=r.data['id']).uploader, self.me)

    def test_a_lie_about_the_content_type_does_not_help(self):
        # An executable renamed and labelled as a JPEG. The bytes decide.
        file = SimpleUploadedFile('photo.jpg', EXE, content_type='image/jpeg')
        r = self.client.post('/api/v2/chat/attachments/', {'kind': 'photo', 'file': file}, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(Attachment.objects.exists())

    def test_a_pdf_cannot_be_sent_as_a_photo(self):
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'photo', 'file': upload('a.pdf', PDF)}, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('not allowed', r.data['detail'])

    def test_each_kind_has_its_own_size_limit(self):
        big_photo = upload('big.jpg', JPEG + b'\x00' * (11 * MB))
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'photo', 'file': big_photo}, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('10 MB', r.data['detail'])

        # The same bytes are fine as a video, which is allowed 50 MB — once they are really a video.
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'video', 'file': upload('v.mp4', MP4 + b'\x00' * (11 * MB))},
                             format='multipart')
        self.assertEqual(r.status_code, 201, r.data)

    def test_a_voice_note_over_five_minutes_is_refused(self):
        file = upload('v.m4a', b'\x00\x00\x00\x18ftypM4A ' + b'\x00' * 64)
        ok = self.client.post('/api/v2/chat/attachments/',
                              {'kind': 'voice', 'file': file, 'duration_s': 299}, format='multipart')
        self.assertEqual(ok.status_code, 201, ok.data)
        too_long = self.client.post('/api/v2/chat/attachments/',
                                    {'kind': 'voice', 'file': upload('v2.m4a', b'\x00\x00\x00\x18ftypM4A '
                                                                     + b'\x00' * 64), 'duration_s': 301},
                                    format='multipart')
        self.assertEqual(too_long.status_code, 400)
        self.assertIn('5 minutes', too_long.data['detail'])

    def test_an_unknown_kind_is_refused(self):
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'executable', 'file': upload('a.jpg', JPEG)}, format='multipart')
        self.assertEqual(r.status_code, 400)

    def test_uploading_needs_a_login(self):
        self.client.force_authenticate(None)
        r = self.client.post('/api/v2/chat/attachments/',
                             {'kind': 'photo', 'file': upload('a.jpg', JPEG)}, format='multipart')
        self.assertEqual(r.status_code, 401)


class AttachmentUseTests(APITestCase):
    """Only the uploader may attach it, once."""

    def setUp(self):
        self.me = user('me@x.tz')
        self.home = home(self.me)
        self.other = user('other@x.tz')
        home(self.other, house='2', north=100)
        from chat.services import add_to_neighbourhood_group
        self.conversation = add_to_neighbourhood_group(self.me, self.home.neighbourhood)
        add_to_neighbourhood_group(self.other, self.home.neighbourhood)
        self.attachment = Attachment.objects.create(uploader=self.me, file=upload('a.jpg', JPEG),
                                                    kind='photo', mime='image/jpeg', size=len(JPEG))

    def test_a_message_carries_the_attachment_to_the_phone(self):
        message, _ = save_message(conversation_id=self.conversation.id, sender=self.me,
                                  kind=Message.Kind.PHOTO, attachment=self.attachment)
        self.client.force_authenticate(self.other)
        payload = self.client.get(f'/api/v2/chat/conversations/{self.conversation.id}/messages/').data
        photo = next(m for m in payload if m['kind'] == 'photo')
        self.assertEqual(photo['attachment']['id'], self.attachment.pk)
        self.assertEqual(photo['attachment']['mime'], 'image/jpeg')

    def test_an_attachment_belongs_to_one_message_only(self):
        save_message(conversation_id=self.conversation.id, sender=self.me,
                     kind=Message.Kind.PHOTO, attachment=self.attachment)
        unused = Attachment.objects.filter(pk=self.attachment.pk, message__isnull=True)
        # The socket's lookup requires message__isnull=True, so a second send finds nothing.
        self.assertFalse(unused.exists())


class AttachmentCleanupTests(APITestCase):
    def test_an_abandoned_upload_is_deleted_after_a_day(self):
        me = user('me@x.tz')
        home(me)
        from chat.services import add_to_neighbourhood_group
        conversation = add_to_neighbourhood_group(me, me.residence_membership.residence.neighbourhood)

        kept = Attachment.objects.create(uploader=me, file=upload('used.jpg', JPEG), kind='photo',
                                         mime='image/jpeg', size=len(JPEG))
        save_message(conversation_id=conversation.id, sender=me, kind=Message.Kind.PHOTO, attachment=kept)
        abandoned = Attachment.objects.create(uploader=me, file=upload('lost.jpg', JPEG), kind='photo',
                                              mime='image/jpeg', size=len(JPEG))
        fresh = Attachment.objects.create(uploader=me, file=upload('new.jpg', JPEG), kind='photo',
                                          mime='image/jpeg', size=len(JPEG))
        old = timezone.now() - timedelta(hours=25)
        Attachment.objects.filter(pk__in=[kept.pk, abandoned.pk]).update(created_at=old)

        self.assertEqual(delete_unused_attachments(), 1)
        self.assertTrue(Attachment.objects.filter(pk=kept.pk).exists())      # used: kept
        self.assertTrue(Attachment.objects.filter(pk=fresh.pk).exists())     # too recent: kept
        self.assertFalse(Attachment.objects.filter(pk=abandoned.pk).exists())
