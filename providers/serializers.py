from rest_framework import serializers

from .models import Payment, Plan, Provider, Subscription, SubscriptionMember


def _masked(phone: str) -> str | None:
    """"0754 ••• 852": enough to recognise my own number, never the whole of it."""
    if len(phone or '') < 8:
        return None
    local = '0' + phone[4:] if phone.startswith('+255') else phone
    return f'{local[:4]} ••• {local[-3:]}'


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['id', 'kind', 'name', 'description', 'price_tsh', 'min_houses', 'features']


class ProviderSerializer(serializers.ModelSerializer):
    plans = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        # No `coverage`: which other areas a provider covers is their business, not a resident's.
        fields = ['id', 'name', 'licence_no', 'verified', 'rating', 'review_count', 'response_min', 'plans']

    def get_plans(self, obj):
        return PlanSerializer(obj.plans.filter(active=True), many=True).data


class MySubscriptionSerializer(serializers.ModelSerializer):
    """My own pool: how full it is, and where I stand in it. No neighbours' names or addresses."""
    plan = PlanSerializer(read_only=True)
    provider = serializers.CharField(source='plan.provider.name', read_only=True)
    joined = serializers.IntegerField(source='joined_count', read_only=True)
    paid = serializers.IntegerField(source='paid_count', read_only=True)
    needed = serializers.IntegerField(source='plan.min_houses', read_only=True)
    my_status = serializers.SerializerMethodField()
    my_payment_id = serializers.SerializerMethodField()
    provider_id = serializers.IntegerField(source='plan.provider_id', read_only=True)
    houses = serializers.SerializerMethodField()
    me = serializers.SerializerMethodField()
    on_duty = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ['id', 'status', 'street', 'starts_at', 'plan', 'provider', 'provider_id', 'joined', 'paid', 'needed',
                  'my_status', 'my_payment_id', 'houses', 'me', 'on_duty']

    def get_houses(self, obj):
        # "Houses on Masaki St" (Figma 1758:186). The same detail a verified neighbour already sees
        # on Neighbours — house number and first name — and nothing for an unverified viewer.
        residence = self.context.get('residence')
        if not residence or not residence.is_verified:
            return []
        rows = obj.members.exclude(status=SubscriptionMember.Status.LEFT).select_related('residence', 'user').order_by('joined_at')
        return [{'house_number': m.residence.house_number, 'first_name': (m.user.full_name or '').split(' ')[0],
                 'status': m.status, 'is_me': m.residence_id == residence.id} for m in rows]

    def get_me(self, obj):
        # My own billing: when I am paid until, whether it renews, my receipts, the number I pay from.
        member = self._me(obj)
        if not member:
            return None
        from main.models import Profile
        profile = Profile.objects.filter(user=member.user, is_phone_verified=True).first()
        phone = profile.phone_number if profile else ''
        return {
            'paid_until': member.paid_until, 'renews': member.renews,
            'pay_phone': _masked(phone),
            'receipts': [{'at': p.settled_at, 'amount_tsh': p.amount_tsh, 'ref': p.mpesa_ref}
                         for p in member.payments.filter(status=Payment.Status.PAID).order_by('-settled_at')[:12]],
        }

    def get_on_duty(self, obj):
        member = self._me(obj)
        provider = obj.plan.provider
        if obj.status != Subscription.Status.ACTIVE or not member or member.status != SubscriptionMember.Status.PAID:
            return None
        if not provider.on_duty_name:
            return None
        return {'name': provider.on_duty_name, 'shift': provider.on_duty_shift, 'phone': provider.phone}

    def _me(self, obj):
        residence = self.context.get('residence')
        return obj.members.filter(residence=residence).first() if residence else None

    def get_my_status(self, obj):
        member = self._me(obj)
        return member.status if member else None

    def get_my_payment_id(self, obj):
        member = self._me(obj)
        if not member:
            return None
        payment = member.payments.filter(status=Payment.Status.PENDING).first()
        return payment.pk if payment else None


class PaymentSerializer(serializers.ModelSerializer):
    """What the phone may poll. No raw callback, no receipt: it only needs to know where it stands."""

    class Meta:
        model = Payment
        fields = ['id', 'amount_tsh', 'status', 'created_at', 'settled_at']
