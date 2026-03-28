from rest_framework import serializers
from .models import Contract, Submission, AuditLog
from users.serializers import UserSerializer


class ContractSerializer(serializers.ModelSerializer):
    payer_detail = UserSerializer(source='payer', read_only=True)
    payee_detail = UserSerializer(source='payee', read_only=True)
    available_actions = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'payer', 'payee', 'payer_detail', 'payee_detail',
            'payee_email', 'worker_wallet', 'title', 'description', 'total_amount',
            'state', 'terms', 'risk_score', 'risk_flags',
            'blockchain_tx_hash', 'blockchain_verified',
            'available_actions', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'payer', 'state', 'risk_score', 'risk_flags',
            'blockchain_tx_hash', 'blockchain_verified', 'created_at', 'updated_at',
        ]

    def get_available_actions(self, obj):
        from .state_machine import get_available_actions
        return get_available_actions(obj)


class CreateContractSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, default='')
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payee_email = serializers.EmailField(required=False, default='')
    worker_wallet = serializers.CharField(max_length=42, required=False, default='')
    terms = serializers.JSONField(required=False, default=dict)
    risk_score = serializers.FloatField(required=False, default=0.0)
    risk_flags = serializers.ListField(required=False, default=list)
    idempotency_key = serializers.CharField(max_length=64, required=False)


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ['id', 'contract', 'submitted_by', 'description', 'file_url', 'created_at']
        read_only_fields = ['id', 'submitted_by', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'entity_type', 'entity_id', 'action', 'old_state',
                  'new_state', 'performed_by', 'metadata', 'timestamp']
