from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

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
