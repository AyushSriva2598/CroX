from django.contrib import admin
from .models import Dispute

@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ['contract', 'raised_by', 'status', 'resolution_type', 'created_at', 'resolved_at']
    list_filter = ['status', 'resolution_type']
