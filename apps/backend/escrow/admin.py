from django.contrib import admin
from .models import EscrowLedger, Payment

@admin.register(EscrowLedger)
class EscrowLedgerAdmin(admin.ModelAdmin):
    list_display = ['contract', 'locked_amount', 'released_amount', 'refunded_amount', 'updated_at']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['contract', 'amount', 'status', 'payment_method', 'transaction_id', 'created_at']
    list_filter = ['status', 'payment_method']
