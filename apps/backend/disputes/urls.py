from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_disputes, name='dispute-list'),
    path('<uuid:dispute_id>/', views.dispute_detail, name='dispute-detail'),
    path('<uuid:dispute_id>/resolve/', views.resolve_dispute, name='dispute-resolve'),
    path('contract/<uuid:contract_id>/', views.create_dispute, name='dispute-create'),
]
