from rest_framework import serializers

from .models import Payment, Plan, Provider, Subscription, SubscriptionMember


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['id', 'kind', 'name', 'description', 'price_tsh', 'min_houses']


class ProviderSerializer(serializers.ModelSerializer):
    plans = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        # No `coverage`: which other areas a provider covers is their business, not a resident's.
        fields = ['id', 'name', 'licence_no', 'rating', 'plans']

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

    class Meta:
        model = Subscription
        fields = ['id', 'status', 'street', 'starts_at', 'plan', 'provider', 'joined', 'paid', 'needed',
                  'my_status', 'my_payment_id']

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
