import uuid
from django.db import models
from django.conf import settings


class Dispute(models.Model):
    RESOLUTION_CHOICES = [
        ('full_release', 'Full Release to Payee'),
        ('partial_split', 'Partial Split'),
        ('full_refund', 'Full Refund to Payer'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('under_review', 'Under Review'),
        ('resolved', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey('contracts.Contract', on_delete=models.CASCADE, related_name='disputes')
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disputes_raised')
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='disputes_resolved')
    reason = models.TextField()
    evidence_url = models.FileField(upload_to='disputes/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolution_type = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, blank=True)
    resolution_notes = models.TextField(blank=True)
    release_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispute on {self.contract.title} by {self.raised_by}"
