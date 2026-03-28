from django.urls import path
from . import views

urlpatterns = [
    path('hash/<uuid:contract_id>/', views.get_contract_hash, name='blockchain-hash'),
    path('register/<uuid:contract_id>/', views.register_on_blockchain, name='blockchain-register'),
    path('verify/<uuid:contract_id>/', views.verify_on_blockchain, name='blockchain-verify'),
]
