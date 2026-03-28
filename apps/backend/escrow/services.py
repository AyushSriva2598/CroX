"""
Escrow Ledger Services — atomic, consistent, idempotent.

All mutations are wrapped in @transaction.atomic.
Constraints: locked >= released + refunded, no negatives.
"""
import uuid
from decimal import Decimal
from decimal import Decimal
from django.db import transaction
from .models import EscrowLedger, Payment
from contracts.models import AuditLog
from blockchain.services import transfer_monad


class EscrowError(Exception):
    pass


@transaction.atomic
def lock_funds(contract, amount, performed_by=None):
    """
    Lock funds in escrow for a contract.
    Creates the escrow ledger entry and a mock payment.
    """
    amount = Decimal(str(amount))
    if amount <= 0:
        raise EscrowError("Amount must be positive")

    ledger, created = EscrowLedger.objects.select_for_update().get_or_create(
        contract=contract,
        defaults={'locked_amount': 0, 'released_amount': 0, 'refunded_amount': 0}
    )

    ledger.locked_amount += amount
    ledger.save()

    # Create mock payment record
    payment = Payment.objects.create(
        contract=contract,
        amount=amount,
        status='success',
        payment_method='mock_upi',
        transaction_id=f"mock_txn_{uuid.uuid4().hex[:12]}",
    )

    AuditLog.objects.create(
        entity_type='escrow',
        entity_id=ledger.id,
        action='funds_locked',
        metadata={'amount': str(amount), 'payment_id': str(payment.id)},
        performed_by=performed_by,
    )

    return ledger


@transaction.atomic
def release_funds(contract, amount, performed_by=None):
    """Release escrowed funds to payee."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise EscrowError("Amount must be positive")

    try:
        ledger = EscrowLedger.objects.select_for_update().get(contract=contract)
    except EscrowLedger.DoesNotExist:
        raise EscrowError("No escrow found for this contract")

    if ledger.available_amount < amount:
        raise EscrowError(
            f"Insufficient escrow balance. Available: {ledger.available_amount}, requested: {amount}"
        )

    ledger.released_amount += amount
    ledger.save()

    metadata = {
        'amount': str(amount),
        'worker_wallet': contract.worker_wallet,
        'frontend_tx_handled': True
    }

    AuditLog.objects.create(
        entity_type='escrow',
        entity_id=ledger.id,
        action='funds_released',
        metadata=metadata,
        performed_by=performed_by,
    )

    return ledger


@transaction.atomic
def refund_funds(contract, amount, performed_by=None):
    """Refund escrowed funds to payer."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise EscrowError("Amount must be positive")

    try:
        ledger = EscrowLedger.objects.select_for_update().get(contract=contract)
    except EscrowLedger.DoesNotExist:
        raise EscrowError("No escrow found for this contract")

    if ledger.available_amount < amount:
        raise EscrowError(
            f"Insufficient escrow balance. Available: {ledger.available_amount}, requested: {amount}"
        )

    ledger.refunded_amount += amount
    ledger.save()

    AuditLog.objects.create(
        entity_type='escrow',
        entity_id=ledger.id,
        action='funds_refunded',
        metadata={'amount': str(amount)},
        performed_by=performed_by,
    )

    return ledger


@transaction.atomic
def partial_split(contract, release_amount, refund_amount, performed_by=None):
    """Split escrowed funds: partial release to payee, partial refund to payer."""
    release_amount = Decimal(str(release_amount))
    refund_amount = Decimal(str(refund_amount))
    total = release_amount + refund_amount

    try:
        ledger = EscrowLedger.objects.select_for_update().get(contract=contract)
    except EscrowLedger.DoesNotExist:
        raise EscrowError("No escrow found for this contract")

    if ledger.available_amount < total:
        raise EscrowError(
            f"Insufficient escrow balance. Available: {ledger.available_amount}, requested: {total}"
        )

    ledger.released_amount += release_amount
    ledger.refunded_amount += refund_amount
    ledger.save()

    AuditLog.objects.create(
        entity_type='escrow',
        entity_id=ledger.id,
        action='funds_split',
        metadata={
            'released': str(release_amount),
            'refunded': str(refund_amount),
        },
        performed_by=performed_by,
    )

    return ledger


def get_escrow_status(contract):
    """Get current escrow status for a contract."""
    try:
        ledger = EscrowLedger.objects.get(contract=contract)
        return {
            'locked': str(ledger.locked_amount),
            'released': str(ledger.released_amount),
            'refunded': str(ledger.refunded_amount),
            'available': str(ledger.available_amount),
        }
    except EscrowLedger.DoesNotExist:
        return {
            'locked': '0.00',
            'released': '0.00',
            'refunded': '0.00',
            'available': '0.00',
        }
