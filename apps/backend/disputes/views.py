from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from contracts.models import Contract
from contracts.state_machine import transition, InvalidTransitionError
from escrow.services import release_funds, refund_funds, partial_split

from .models import Dispute
from .serializers import DisputeSerializer, ResolveDisputeSerializer


@api_view(['POST'])
def create_dispute(request, contract_id):
    """Raise a dispute on a contract."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    dispute = Dispute.objects.create(
        contract=contract,
        raised_by=request.user,
        reason=request.data.get('reason', ''),
        evidence_url=request.FILES.get('evidence'),
    )

    # Transition contract to disputed
    try:
        transition(contract, 'dispute', performed_by=request.user)
    except InvalidTransitionError as e:
        dispute.delete()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def dispute_detail(request, dispute_id):
    """Get dispute details."""
    try:
        dispute = Dispute.objects.select_related('contract', 'raised_by').get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response({'error': 'Dispute not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(DisputeSerializer(dispute).data)


@api_view(['GET'])
def list_disputes(request):
    """List all disputes (admin) or user's disputes."""
    if request.user.is_staff:
        disputes = Dispute.objects.all()
    else:
        disputes = Dispute.objects.filter(raised_by=request.user)
    return Response(DisputeSerializer(disputes, many=True).data)


@api_view(['POST'])
@transaction.atomic
def resolve_dispute(request, dispute_id):
    """Resolve a dispute — admin only."""
    serializer = ResolveDisputeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        dispute = Dispute.objects.select_for_update().get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response({'error': 'Dispute not found'}, status=status.HTTP_404_NOT_FOUND)

    contract = dispute.contract
    resolution_type = data['resolution_type']

    try:
        if resolution_type == 'full_release':
            release_funds(contract, contract.total_amount, performed_by=request.user)
            transition(contract, 'resolve_release', performed_by=request.user)
        elif resolution_type == 'full_refund':
            refund_funds(contract, contract.total_amount, performed_by=request.user)
            transition(contract, 'resolve_refund', performed_by=request.user)
        elif resolution_type == 'partial_split':
            release_amt = data.get('release_amount', 0)
            refund_amt = data.get('refund_amount', 0)
            partial_split(contract, release_amt, refund_amt, performed_by=request.user)
            transition(contract, 'resolve_split', performed_by=request.user)
    except (InvalidTransitionError, Exception) as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    dispute.status = 'resolved'
    dispute.resolution_type = resolution_type
    dispute.resolution_notes = data.get('resolution_notes', '')
    dispute.resolved_by = request.user
    dispute.resolved_at = timezone.now()
    dispute.release_amount = data.get('release_amount', 0)
    dispute.refund_amount = data.get('refund_amount', 0)
    dispute.save()

    return Response(DisputeSerializer(dispute).data)
