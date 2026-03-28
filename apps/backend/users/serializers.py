from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'email', 'full_name', 'role',
                  'is_verified', 'reputation_score', 'created_at']
        read_only_fields = ['id', 'is_verified', 'reputation_score', 'created_at']


class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    full_name = serializers.CharField(max_length=255, required=False, default='')


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    otp_code = serializers.CharField(max_length=6)
