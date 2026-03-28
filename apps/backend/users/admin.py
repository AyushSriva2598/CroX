from django.contrib import admin
from .models import User, OTPToken, AuthToken

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'phone_number', 'full_name', 'role', 'is_verified', 'reputation_score', 'created_at']
    list_filter = ['role', 'is_verified']
    search_fields = ['email', 'phone_number', 'full_name']

@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ['email', 'otp_code', 'is_used', 'created_at', 'expires_at']

@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'key', 'created_at']
