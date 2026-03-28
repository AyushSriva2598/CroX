from django.urls import path
from . import views

urlpatterns = [
    path('send-otp/', views.send_otp, name='send-otp'),
    path('verify-otp/', views.verify_otp, name='verify-otp'),
    path('demo-login/', views.demo_oauth_login, name='demo-login'),
    path('google-login/', views.google_login, name='google-login'),
    path('profile/', views.get_profile, name='profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
]
