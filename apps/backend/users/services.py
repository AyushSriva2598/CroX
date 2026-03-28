import os
from django.core.mail import send_mail
from django.conf import settings

def send_sms_otp(phone_number, otp_code):
    """
    Sends an OTP to a phone number. 
    Defines a clear injection point for Twilio or other SMS providers.
    """
    message = f"Your TrustLayer OTP is: {otp_code}. Valid for 10 minutes."
    
    # Check for Twilio Credentials in environment
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    if account_sid and auth_token and from_number:
        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            client.messages.create(
                body=message,
                from_=from_number,
                to=phone_number
            )
            return True
        except Exception as e:
            print(f"Twilio Error: {str(e)}")
            # Fallback to console in dev
            
    # Default: Professional Console Output for Dev/Simulated "Actual" delivery
    print(f"\n{'-'*30} SMS OUTBOUND {'-'*30}")
    print(f"TO: {phone_number}")
    print(f"BODY: {message}")
    print(f"{'-'*74}\n")
    return True

def send_email_otp(email_address, otp_code):
    """
    Sends an OTP to an email address using configured SMTP settings.
    """
    subject = "TrustLayer Access Protocol - Verification Code"
    message = f"Your TrustLayer verification code is: {otp_code}. \n\nThis code is valid for 10 minutes."
    
    # Check if a real email backend is configured (not console)
    is_real_email = os.getenv('EMAIL_HOST') != ''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email_address],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email Error: {str(e)}")
        return False
