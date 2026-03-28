import uuid
from django.db import models
from django.conf import settings


class Contract(models.Model):
    STATE_CHOICES = [
        ('draft', 'Draft'),
        ('pending_acceptance', 'Pending Acceptance'),
        ('active', 'Active'),
        ('funds_locked', 'Funds Locked'),
        ('work_submitted', 'Work Submitted'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('disputed', 'Disputed'),
        ('resolved', 'Resolved'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contracts_as_payer')
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contracts_as_payee', null=True, blank=True)
    payee_email = models.EmailField(blank=True, help_text='Email of payee if not yet registered')
    worker_wallet = models.CharField(max_length=42, blank=True, help_text='Worker EVM wallet address (0x...)')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default='draft')
    terms = models.JSONField(default=dict, blank=True, help_text='Structured terms from AI parsing')
    risk_score = models.FloatField(default=0.0, help_text='AI-assessed risk score 0-100')
    risk_flags = models.JSONField(default=list, blank=True, help_text='Risk flags from AI')
    blockchain_tx_hash = models.CharField(max_length=66, blank=True, help_text='Monad transaction hash')
    blockchain_verified = models.BooleanField(default=False)
    idempotency_key = models.CharField(max_length=64, blank=True, unique=True, null=True)
    current_milestone = models.IntegerField(default=0, help_text='Index of the current active milestone')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.state})"


class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='submissions')
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    file_url = models.FileField(upload_to='submissions/', blank=True, null=True)
    link = models.URLField(max_length=2000, blank=True, help_text='URL to external work delivery')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Submission for {self.contract.title}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=50)  # 'contract', 'payment', 'dispute'
    entity_id = models.UUIDField()
    action = models.CharField(max_length=100)
    old_state = models.CharField(max_length=50, blank=True)
    new_state = models.CharField(max_length=50, blank=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} on {self.entity_type}:{self.entity_id}"
