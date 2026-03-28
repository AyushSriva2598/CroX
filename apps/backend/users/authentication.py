from rest_framework import authentication
from rest_framework import exceptions
from .models import AuthToken


class OTPTokenAuthentication(authentication.BaseAuthentication):
    """Custom token authentication using our AuthToken model."""
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token_key = parts[1]
        try:
            token = AuthToken.objects.select_related('user').get(key=token_key)
        except AuthToken.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token')

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed('User is inactive')

        return (token.user, token)
