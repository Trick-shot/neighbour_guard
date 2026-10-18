from django.contrib import admin

from .models import Conversation, Message, Participant

admin.site.register([Conversation, Participant, Message])
