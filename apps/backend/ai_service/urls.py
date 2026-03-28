from django.urls import path
from . import views

urlpatterns = [
    path('parse-contract/', views.parse_contract_view, name='ai-parse-contract'),
    path('parse-contract/demo/', views.parse_contract_demo, name='ai-parse-contract-demo'),
]
