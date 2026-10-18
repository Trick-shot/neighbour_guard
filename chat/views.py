from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.parsers import FormParser, MultiPartParser

from . import files, services
from .models import Attachment, Conversation, Message
from .serializers import AttachmentSerializer, ConversationSerializer, MessageSerializer

User = get_user_model()
PAGE_SIZE = 50


class ConversationListView(APIView):
    """GET: my conversations. POST {user_id}: open a direct chat with a neighbour."""

    def get(self, request):
        qs = Conversation.objects.filter(participants__user=request.user).order_by('-updated_at').prefetch_related('participants')
        return Response(ConversationSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        other = get_object_or_404(User, pk=request.data.get('user_id'), is_active=True)
        if other == request.user:
            return Response({'detail': 'You cannot message yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        conversation = services.get_or_create_direct(request.user, other)
        return Response(ConversationSerializer(conversation, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


class MessageListView(APIView):
    """GET /conversations/<id>/messages/?before=<message id> — newest 50, oldest first.

    Also used after a socket reconnect to fetch anything missed.
    """

    def get(self, request, pk):
        if not services.is_participant(request.user, pk):
            return Response(status=status.HTTP_404_NOT_FOUND)
        qs = Message.objects.filter(conversation_id=pk).select_related('sender')
        before = request.query_params.get('before')
        after = request.query_params.get('after')
        if before:
            qs = qs.filter(id__lt=before)
        if after:
            qs = qs.filter(id__gt=after).order_by('id')[:PAGE_SIZE]
            return Response(MessageSerializer(qs, many=True).data)
        page = list(qs.order_by('-id')[:PAGE_SIZE])[::-1]
        return Response(MessageSerializer(page, many=True).data)


class TicketView(APIView):
    """POST /api/v2/chat/ticket/ — one-time ticket for the WebSocket URL."""

    def post(self, request):
        return Response({'ticket': services.issue_ticket(request.user), 'expires_in': services.TICKET_TTL_SECONDS})


class AttachmentView(APIView):
    """POST /api/v2/chat/attachments/ (multipart) — upload a file, then send it over the socket.

    Two steps on purpose: a socket frame is the wrong place for 50 MB of video, and an upload that
    fails half way should not lose the message. The upload is not attached to any conversation yet;
    the socket decides that, and only the uploader can use it.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'No file.'}, status=status.HTTP_400_BAD_REQUEST)
        kind = request.data.get('kind')
        try:
            duration = int(request.data.get('duration_s') or 0) or None
        except (TypeError, ValueError):
            duration = None
        try:
            # The client's Content-Type is a claim; this checks the bytes.
            mime = files.check(upload, kind, duration)
        except files.Rejected as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        attachment = Attachment.objects.create(
            uploader=request.user, file=upload, kind=kind, mime=mime, size=upload.size,
            duration_s=duration,
        )
        return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)
