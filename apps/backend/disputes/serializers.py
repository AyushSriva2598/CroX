from rest_framework import serializers
from .models import Dispute


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ['id', 'contract', 'raised_by', 'resolved_by', 'reason',
                  'evidence_url', 'status', 'resolution_type', 'resolution_notes',
                  'release_amount', 'refund_amount', 'created_at', 'resolved_at']
        read_only_fields = ['id', 'raised_by', 'resolved_by', 'status',
                           'resolution_type', 'resolved_at', 'created_at']


class ResolveDisputeSerializer(serializers.Serializer):
    resolution_type = serializers.ChoiceField(choices=['full_release', 'partial_split', 'full_refund'])
    resolution_notes = serializers.CharField(required=False, default='')
    release_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    refund_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
