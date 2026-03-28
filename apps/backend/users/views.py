import random
import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
import time

from .models import User, OTPToken, AuthToken
from .serializers import SendOTPSerializer, VerifyOTPSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """Send OTP to phone number. Creates user if not exists."""
    serializer = SendOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    phone = serializer.validated_data['phone_number']
    full_name = serializer.validated_data.get('full_name', '')

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"

    # Store OTP
    OTPToken.objects.create(
        phone_number=phone,
        otp_code=otp_code,
        expires_at=timezone.now() + timedelta(minutes=10)
    )

    # In dev: OTP is printed to console via email backend
    # In production: send via SMS
    print(f"\n{'='*50}")
    print(f"  OTP for {phone}: {otp_code}")
    print(f"{'='*50}\n")

    try:
        send_mail(
            subject='Your TrustLayer OTP',
            message=f'Your OTP is: {otp_code}. Valid for 10 minutes.',
            from_email='noreply@trustlayer.dev',
            recipient_list=[f'{phone}@trustlayer.dev'],  # placeholder
            fail_silently=True,
        )
    except Exception:
        pass  # Console backend will still print

    return Response({
        'message': 'OTP sent successfully',
        'phone_number': phone,
        # Include OTP in dev mode for easy testing
        'otp_code_dev_only': otp_code,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Verify OTP and return auth token."""
    serializer = VerifyOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    phone = serializer.validated_data['phone_number']
    otp_code = serializer.validated_data['otp_code']

    # Find valid OTP
    otp = OTPToken.objects.filter(
        phone_number=phone,
        otp_code=otp_code,
        is_used=False,
        expires_at__gt=timezone.now()
    ).first()

    if not otp:
        return Response(
            {'error': 'Invalid or expired OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mark OTP as used
    otp.is_used = True
    otp.save()

    # Get or create user
    user, created = User.objects.get_or_create(
        phone_number=phone,
        defaults={'is_verified': True}
    )
    if not user.is_verified:
        user.is_verified = True
        user.save()

    # Create JWT token
    refresh = RefreshToken.for_user(user)

    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'created': created,
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def demo_oauth_login(request):
    """Mock OAuth login for demo purposes."""
    role = request.data.get('role', 'admin') # 'admin' or 'worker'
    
    # Create or get standard demo users
    if role == 'admin':
        phone = '+10000000000'
        name = 'Demo Admin'
    else:
        phone = '+19999999999'
        name = 'Demo Worker'
        
    user, created = User.objects.get_or_create(
        phone_number=phone,
        defaults={
            'is_verified': True,
            'full_name': name
        }
    )
    
    # Generate JWT
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'created': created,
        'message': f'Logged in as {name}'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Google OAuth2 Login Flow."""
    token = request.data.get('credential')
    
    if not token:
        return Response({'error': 'No credential provided'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo.get('email')
        name = idinfo.get('name', 'Google User')
        
        if not email:
            return Response({'error': 'No email in Google token'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a dummy phone number since the DB requires a unique phone_number (max 15 chars)
        dummy_phone = f"+G{str(int(time.time()*100))}"[:15]
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'phone_number': dummy_phone,
                'full_name': name,
                'is_verified': True
            }
        )
        
        refresh = RefreshToken.for_user(user)

        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'created': created,
            'message': f'Logged in via Google as {name}'
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        # Invalid token
        return Response({'error': f'Invalid Google token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Internal Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_profile(request):
    """Get current user profile."""
    return Response(UserSerializer(request.user).data)


@api_view(['PUT'])
def update_profile(request):
    """Update current user profile."""
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
