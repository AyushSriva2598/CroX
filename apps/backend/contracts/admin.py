from django.contrib import admin
from .models import Contract, Submission, AuditLog

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['title', 'payer', 'payee', 'total_amount', 'state', 'risk_score', 'blockchain_verified', 'created_at']
    list_filter = ['state', 'blockchain_verified']
    search_fields = ['title', 'payer__phone_number', 'payee__phone_number']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['contract', 'submitted_by', 'created_at']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'action', 'old_state', 'new_state', 'performed_by', 'timestamp']
    list_filter = ['entity_type', 'action']
