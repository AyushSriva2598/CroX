from decimal import Decimal
from django.test import TestCase

from users.models import User
from contracts.models import Contract
from escrow.models import EscrowLedger, Payment
from escrow.services import lock_funds, release_funds, refund_funds, partial_split, EscrowError


class TestEscrowLedger(TestCase):
    def setUp(self):
        self.payer = User.objects.create_user(phone_number='+919876543210')
        self.payee = User.objects.create_user(phone_number='+918765432109')
        self.contract = Contract.objects.create(
            payer=self.payer,
            payee=self.payee,
            title='Test Contract',
            total_amount=1000.00,
            state='active'
        )

    def test_lock_funds(self):
        ledger = lock_funds(self.contract, 1000.00, performed_by=self.payer)
        self.assertEqual(ledger.locked_amount, Decimal('1000.00'))
        self.assertEqual(ledger.available_amount, Decimal('1000.00'))
        
        # Verify payment mock created
        payment = Payment.objects.get(contract=self.contract)
        self.assertEqual(payment.amount, Decimal('1000.00'))
        self.assertEqual(payment.status, 'success')

    def test_release_funds(self):
        lock_funds(self.contract, 1000.00, performed_by=self.payer)
        ledger = release_funds(self.contract, 1000.00, performed_by=self.payer)
        
        self.assertEqual(ledger.locked_amount, Decimal('1000.00'))
        self.assertEqual(ledger.released_amount, Decimal('1000.00'))
        self.assertEqual(ledger.available_amount, Decimal('0.00'))

    def test_refund_funds(self):
        lock_funds(self.contract, 1000.00, performed_by=self.payer)
        ledger = refund_funds(self.contract, 1000.00, performed_by=self.admin) if hasattr(self, 'admin') else refund_funds(self.contract, 1000.00, performed_by=self.payer)
        
        self.assertEqual(ledger.locked_amount, Decimal('1000.00'))
        self.assertEqual(ledger.refunded_amount, Decimal('1000.00'))
        self.assertEqual(ledger.available_amount, Decimal('0.00'))

    def test_partial_split(self):
        lock_funds(self.contract, 1000.00, performed_by=self.payer)
        ledger = partial_split(self.contract, 600.00, 400.00, performed_by=self.payer)
        
        self.assertEqual(ledger.locked_amount, Decimal('1000.00'))
        self.assertEqual(ledger.released_amount, Decimal('600.00'))
        self.assertEqual(ledger.refunded_amount, Decimal('400.00'))
        self.assertEqual(ledger.available_amount, Decimal('0.00'))

    def test_overdraft_raises_error(self):
        lock_funds(self.contract, 500.00, performed_by=self.payer)
        with self.assertRaises(EscrowError):
            release_funds(self.contract, 1000.00, performed_by=self.payer)

    def test_negative_amount_raises_error(self):
        with self.assertRaises(EscrowError):
            lock_funds(self.contract, -100.00, performed_by=self.payer)
