from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:contract_id>/status/', views.escrow_status, name='escrow-status'),
    path('<uuid:contract_id>/payments/', views.payment_history, name='payment-history'),
]
