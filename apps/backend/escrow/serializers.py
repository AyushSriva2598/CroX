from rest_framework import serializers
from .models import EscrowLedger, Payment


class EscrowLedgerSerializer(serializers.ModelSerializer):
    available_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = EscrowLedger
        fields = ['id', 'contract', 'locked_amount', 'released_amount',
                  'refunded_amount', 'available_amount', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'contract', 'amount', 'status', 'payment_method',
                  'transaction_id', 'created_at']
