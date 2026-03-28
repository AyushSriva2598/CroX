from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from contracts.models import Contract
from .services import register_contract_on_chain, verify_contract_on_chain, compute_contract_hash

@api_view(['GET'])
def get_contract_hash(request, contract_id):
    """Return the raw contract hash so the frontend wallet can sign the transaction."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    contract_data = {
        'id': str(contract.id),
        'title': contract.title,
        'total_amount': str(contract.total_amount),
        'payer_id': str(contract.payer_id),
        'payee_id': str(contract.payee_id) if contract.payee_id else '',
        'terms': contract.terms,
    }
    
    hash_bytes = compute_contract_hash(contract_data)
    hash_hex = '0x' + hash_bytes.hex()
    
    return Response({
        'contract_hash': hash_hex,
        'registry_address': '0xb0CA197bFf061CaBc86539daAE95bB37F82aAe5d' # Monad Testnet registry
    })


@api_view(['POST'])
def register_on_blockchain(request, contract_id):
    """Register a contract hash on Monad blockchain."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    result = register_contract_on_chain(contract)

    if result.get('success'):
        contract.blockchain_tx_hash = result['tx_hash']
        contract.blockchain_verified = True
        contract.save(update_fields=['blockchain_tx_hash', 'blockchain_verified'])

    return Response(result)


@api_view(['GET'])
def verify_on_blockchain(request, contract_id):
    """Verify a contract hash on Monad blockchain."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    result = verify_contract_on_chain(contract)

    return Response({
        **result,
        'blockchain_tx_hash': contract.blockchain_tx_hash,
        'explorer_url': f"https://testnet.monadscan.com/tx/{contract.blockchain_tx_hash}" if contract.blockchain_tx_hash else None,
    })
