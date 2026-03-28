from rest_framework.decorators import api_view
from rest_framework.response import Response

from contracts.models import Contract
from .services import get_escrow_status
from .models import Payment
from .serializers import PaymentSerializer


@api_view(['GET'])
def escrow_status(request, contract_id):
    """Get escrow ledger status for a contract."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=404)

    return Response(get_escrow_status(contract))


@api_view(['GET'])
def payment_history(request, contract_id):
    """Get payment history for a contract."""
    payments = Payment.objects.filter(contract_id=contract_id)
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)
