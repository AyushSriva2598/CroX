import uuid
from django.db import models
from django.conf import settings


class EscrowLedger(models.Model):
    """
    Single source of truth for escrowed funds.
    CRITICAL: locked >= released + refunded, no negatives, atomic updates only.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.OneToOneField('contracts.Contract', on_delete=models.CASCADE, related_name='escrow')
    locked_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    released_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(locked_amount__gte=0),
                name='locked_amount_non_negative',
            ),
            models.CheckConstraint(
                check=models.Q(released_amount__gte=0),
                name='released_amount_non_negative',
            ),
            models.CheckConstraint(
                check=models.Q(refunded_amount__gte=0),
                name='refunded_amount_non_negative',
            ),
        ]

    @property
    def available_amount(self):
        return self.locked_amount - self.released_amount - self.refunded_amount

    def __str__(self):
        return f"Escrow for {self.contract}: locked={self.locked_amount}, released={self.released_amount}, refunded={self.refunded_amount}"


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey('contracts.Contract', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, default='mock_upi')
    transaction_id = models.CharField(max_length=100, blank=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    idempotency_key = models.CharField(max_length=64, blank=True, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.id} - {self.amount} ({self.status})"
