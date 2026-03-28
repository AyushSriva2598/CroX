from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contract, Submission, AuditLog
from .serializers import ContractSerializer, CreateContractSerializer, SubmissionSerializer, AuditLogSerializer
from .state_machine import transition, get_available_actions, InvalidTransitionError
from escrow.services import lock_funds, release_funds
from users.models import User


@api_view(['GET', 'POST'])
def contract_list(request):
    """List contracts or create a new one."""
    if request.method == 'GET':
        from django.db.models import Q
        contracts = Contract.objects.filter(
            Q(payer=request.user) | Q(payee=request.user)
        ).select_related('payer', 'payee')
        serializer = ContractSerializer(contracts, many=True)
        return Response(serializer.data)

    # POST - create contract
    serializer = CreateContractSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Idempotency check
    idem_key = data.get('idempotency_key')
    if idem_key:
        existing = Contract.objects.filter(idempotency_key=idem_key).first()
        if existing:
            return Response(ContractSerializer(existing).data, status=status.HTTP_200_OK)

    # Find payee if email provided
    payee = None
    if data.get('payee_email'):
        payee = User.objects.filter(email=data['payee_email']).first()

    contract = Contract.objects.create(
        payer=request.user,
        payee=payee,
        payee_email=data.get('payee_email', ''),
        worker_wallet=data.get('worker_wallet', ''),
        title=data['title'],
        description=data.get('description', ''),
        total_amount=data['total_amount'],
        terms=data.get('terms', {}),
        risk_score=data.get('risk_score', 0.0),
        risk_flags=data.get('risk_flags', []),
        idempotency_key=idem_key,
        state='draft',
    )

    AuditLog.objects.create(
        entity_type='contract',
        entity_id=contract.id,
        action='created',
        new_state='draft',
        performed_by=request.user,
    )

    return Response(ContractSerializer(contract).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def available_contracts(request):
    """List contracts that are waiting to be accepted by any worker."""
    contracts = Contract.objects.filter(
        state='pending_acceptance',
        payee__isnull=True
    ).select_related('payer')
    serializer = ContractSerializer(contracts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def contract_detail(request, contract_id):
    """Get contract details with audit log."""
    try:
        contract = Contract.objects.select_related('payer', 'payee').get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    audit_logs = AuditLog.objects.filter(entity_type='contract', entity_id=contract_id)

    return Response({
        'contract': ContractSerializer(contract).data,
        'audit_log': AuditLogSerializer(audit_logs, many=True).data,
    })


def _perform_action(request, contract_id, action):
    """Helper to perform a state machine action on a contract."""
    try:
        contract = Contract.objects.select_related('payer', 'payee').get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        contract = transition(contract, action, performed_by=request.user)
    except InvalidTransitionError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ContractSerializer(contract).data)


@api_view(['POST'])
def contract_submit_for_acceptance(request, contract_id):
    """Payer submits contract for payee acceptance."""
    return _perform_action(request, contract_id, 'submit')


@api_view(['POST'])
def contract_accept(request, contract_id):
    """Payee accepts the contract."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    # Assign payee if not set
    if not contract.payee:
        contract.payee = request.user
        
    worker_wallet = request.data.get('worker_wallet')
    if worker_wallet:
        contract.worker_wallet = worker_wallet
        
    contract.save(update_fields=['payee', 'worker_wallet'])

    try:
        contract = transition(contract, 'accept', performed_by=request.user)
    except InvalidTransitionError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ContractSerializer(contract).data)


@api_view(['POST'])
@transaction.atomic
def contract_pay(request, contract_id):
    """Mock payment — locks funds in escrow."""
    try:
        contract = Contract.objects.select_for_update().get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        contract = transition(contract, 'pay', performed_by=request.user)
        lock_funds(contract, contract.total_amount, performed_by=request.user)
    except InvalidTransitionError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ContractSerializer(contract).data)


@api_view(['POST'])
def contract_submit_work(request, contract_id):
    """Payee submits work/proof."""
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    # Create submission record
    Submission.objects.create(
        contract=contract,
        submitted_by=request.user,
        description=request.data.get('description', ''),
        file_url=request.FILES.get('file'),
        link=request.data.get('link', ''),
    )

    try:
        contract = transition(contract, 'submit_work', performed_by=request.user)
    except InvalidTransitionError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ContractSerializer(contract).data)


@api_view(['POST'])
@transaction.atomic
def contract_approve(request, contract_id):
    """Payer approves work — releases funds."""
    try:
        contract = Contract.objects.select_for_update().get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        # Determine amount to release based on current milestone
        milestones = contract.terms.get('milestones', [])
        if milestones and contract.current_milestone < len(milestones):
            release_amt = milestones[contract.current_milestone].get('amount', contract.total_amount)
        else:
            release_amt = contract.total_amount

        contract = transition(contract, 'approve', performed_by=request.user)
        release_funds(contract, release_amt, performed_by=request.user)

        # Move to next milestone tracking regardless of state
        if milestones and contract.current_milestone < len(milestones):
            contract.current_milestone += 1
            contract.save(update_fields=['current_milestone'])

    except InvalidTransitionError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ContractSerializer(contract).data)


@api_view(['POST'])
def contract_dispute(request, contract_id):
    """Raise a dispute on a contract."""
    return _perform_action(request, contract_id, 'dispute')


@api_view(['POST'])
def contract_cancel(request, contract_id):
    """Cancel a contract."""
    return _perform_action(request, contract_id, 'cancel')


@api_view(['GET'])
def contract_submissions(request, contract_id):
    """List submissions for a contract."""
    submissions = Submission.objects.filter(contract_id=contract_id)
    serializer = SubmissionSerializer(submissions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def contract_audit_log(request, contract_id):
    """Get audit log for a contract."""
    logs = AuditLog.objects.filter(entity_type='contract', entity_id=contract_id)
    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)
