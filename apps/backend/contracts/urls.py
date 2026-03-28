from django.urls import path
from . import views

urlpatterns = [
    path('', views.contract_list, name='contract-list'),
    path('available/', views.available_contracts, name='contract-available'),
    path('<uuid:contract_id>/', views.contract_detail, name='contract-detail'),
    path('<uuid:contract_id>/submit/', views.contract_submit_for_acceptance, name='contract-submit'),
    path('<uuid:contract_id>/accept/', views.contract_accept, name='contract-accept'),
    path('<uuid:contract_id>/pay/', views.contract_pay, name='contract-pay'),
    path('<uuid:contract_id>/submit-work/', views.contract_submit_work, name='contract-submit-work'),
    path('<uuid:contract_id>/approve/', views.contract_approve, name='contract-approve'),
    path('<uuid:contract_id>/dispute/', views.contract_dispute, name='contract-dispute'),
    path('<uuid:contract_id>/cancel/', views.contract_cancel, name='contract-cancel'),
    path('<uuid:contract_id>/submissions/', views.contract_submissions, name='contract-submissions'),
    path('<uuid:contract_id>/audit-log/', views.contract_audit_log, name='contract-audit-log'),
]
