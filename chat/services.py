"""Chat rules shared by the REST views, the WebSocket consumer and other apps."""
import secrets

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.db import IntegrityError, transaction

from .models import Conversation, Message, Participant

TICKET_TTL_SECONDS = 30


def group_name(conversation_id: int) -> str:
    return f'chat2_{conversation_id}'


def is_participant(user, conversation_id: int) -> bool:
    return Participant.objects.filter(conversation_id=conversation_id, user=user).exists()


def neighbourhood_group(neighbourhood) -> Conversation:
    conversation, _ = Conversation.objects.get_or_create(
        neighbourhood=neighbourhood,
        defaults={'kind': Conversation.Kind.GROUP, 'name': f'{neighbourhood.name} neighbours'},
    )
    return conversation


def add_to_neighbourhood_group(user, neighbourhood) -> Conversation:
    conversation = neighbourhood_group(neighbourhood)
    Participant.objects.get_or_create(conversation=conversation, user=user)
    return conversation


def get_or_create_direct(user, other) -> Conversation:
    existing = (
        Conversation.objects.filter(kind=Conversation.Kind.DIRECT, participants__user=user)
        .filter(participants__user=other)
        .first()
    )
    if existing:
        return existing
    with transaction.atomic():
        conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT)
        Participant.objects.bulk_create([
            Participant(conversation=conversation, user=user),
            Participant(conversation=conversation, user=other),
        ])
    return conversation


def save_message(*, conversation_id, sender, kind=Message.Kind.TEXT, body='', client_id=None, alert=None,
                 issue_id=None):
    """Create a message, or return the existing one when the same client_id is retried."""
    if client_id:
        existing = Message.objects.filter(sender=sender, client_id=client_id).first()
        if existing:
            return existing, False
    try:
        with transaction.atomic():
            message = Message.objects.create(
                conversation_id=conversation_id, sender=sender, kind=kind, body=body,
                client_id=client_id, alert=alert, issue_id=issue_id,
            )
    except IntegrityError:  # two retries raced past the check above
        return Message.objects.get(sender=sender, client_id=client_id), False
    Conversation.objects.filter(pk=conversation_id).update(updated_at=message.created_at)
    return message, True


def message_event(message: Message) -> dict:
    """The JSON shape sent to phones for a message (REST and socket use the same one)."""
    return {
        'id': message.id,
        'conversation_id': message.conversation_id,
        'client_id': str(message.client_id) if message.client_id else None,
        'kind': message.kind,
        'body': message.body,
        'sender_id': message.sender_id,
        'sender_name': message.sender.full_name if message.sender else None,
        'alert_id': message.alert_id,
        'issue_id': message.issue_id,
        'created_at': message.created_at.isoformat(),
    }


def broadcast(conversation_id: int, event_type: str, payload: dict):
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(group_name(conversation_id), {'type': event_type, 'payload': payload})


def post_alert_card(alert):
    """Put a live alert card into the sender's neighbourhood group."""
    conversation = neighbourhood_group(alert.neighbourhood)
    message, created = save_message(
        conversation_id=conversation.id, sender=alert.sender, kind=Message.Kind.ALERT,
        body=alert.message, alert=alert, client_id=alert.client_id,
    )
    if created:
        broadcast(conversation.id, 'chat.message', message_event(message))
    return message


def post_issue_card(user, issue):
    """Put an issue card in the sharer's own neighbourhood group.

    The card stores only the issue id, like an alert card: whoever opens it is then subject to the
    issue's own visibility rules, so sharing can never hand someone a view they may not have.
    """
    home_group = neighbourhood_group(issue.neighbourhood)
    message, created = save_message(
        conversation_id=home_group.id, sender=user, kind=Message.Kind.ISSUE,
        body=issue.title, issue_id=issue.pk,
    )
    if created:
        broadcast(home_group.id, 'chat.message', message_event(message))
    return message


def broadcast_alert_update(alert, payload: dict):
    """Refresh every alert card for this alert (LIVE badge, responders)."""
    for conversation_id in alert.messages.values_list('conversation_id', flat=True).distinct():
        broadcast(conversation_id, 'chat.alert_update', payload)


def issue_ticket(user) -> str:
    """A 30-second, one-time ticket for opening a socket, so the JWT never travels in a URL."""
    ticket = secrets.token_urlsafe(24)
    cache.set(f'ws-ticket:{ticket}', user.pk, TICKET_TTL_SECONDS)
    return ticket


def redeem_ticket(ticket: str):
    if not ticket:
        return None
    key = f'ws-ticket:{ticket}'
    user_id = cache.get(key)
    if user_id is None:
        return None
    cache.delete(key)
    return user_id
