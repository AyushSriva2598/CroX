import uuid
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User
from contracts.models import Contract, AuditLog
from contracts.state_machine import transition, InvalidTransitionError


class TestStateMachine(TestCase):
    def setUp(self):
        self.payer = User.objects.create_user(phone_number='+919876543210')
        self.payee = User.objects.create_user(phone_number='+918765432109')
        self.contract = Contract.objects.create(
            payer=self.payer,
            title='Test Contract',
            total_amount=1000.00,
            state='draft'
        )

    def test_valid_transitions(self):
        # draft -> pending_acceptance
        self.contract = transition(self.contract, 'submit', performed_by=self.payer)
        self.assertEqual(self.contract.state, 'pending_acceptance')

        # pending_acceptance -> active
        self.contract.payee = self.payee
        self.contract.save()
        self.contract = transition(self.contract, 'accept', performed_by=self.payee)
        self.assertEqual(self.contract.state, 'active')

        # active -> funds_locked
        self.contract = transition(self.contract, 'pay', performed_by=self.payer)
        self.assertEqual(self.contract.state, 'funds_locked')

        # funds_locked -> work_submitted
        self.contract = transition(self.contract, 'submit_work', performed_by=self.payee)
        self.assertEqual(self.contract.state, 'work_submitted')

        # work_submitted -> completed
        self.contract = transition(self.contract, 'approve', performed_by=self.payer)
        self.assertEqual(self.contract.state, 'completed')

        # Verify audit logs
        logs = AuditLog.objects.filter(entity_type='contract', entity_id=self.contract.id)
        self.assertEqual(logs.count(), 5)
        actions = [log.action for log in logs.order_by('timestamp')]
        self.assertEqual(actions, ['submit', 'accept', 'pay', 'submit_work', 'approve'])

    def test_invalid_transition(self):
        # Cannot 'approve' a draft
        with self.assertRaises(InvalidTransitionError):
            transition(self.contract, 'approve', performed_by=self.payer)

    def test_terminal_state(self):
        self.contract.state = 'completed'
        self.contract.save()
        
        with self.assertRaises(InvalidTransitionError):
            transition(self.contract, 'cancel', performed_by=self.payer)


class TestContractAPI(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.payer = User.objects.create_user(phone_number='+919876543210')
        self.payee = User.objects.create_user(phone_number='+918765432109')
        
        # We need AuthTokens
        from users.models import AuthToken
        self.payer_token = AuthToken.objects.create(key='payer_token', user=self.payer)
        self.payee_token = AuthToken.objects.create(key='payee_token', user=self.payee)

    def test_full_lifecycle(self):
        # 1. Create contract (as payer)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.payer_token.key)
        response = self.client.post(reverse('contract-list'), {
            'title': 'API Test Contract',
            'total_amount': '5000.00'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contract_id = response.data['id']

        # 2. Submit for acceptance
        response = self.client.post(reverse('contract-submit', args=[contract_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['state'], 'pending_acceptance')

        # 3. Accept (as payee)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.payee_token.key)
        response = self.client.post(reverse('contract-accept', args=[contract_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['state'], 'active')

        # 4. Pay (as payer)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.payer_token.key)
        response = self.client.post(reverse('contract-pay', args=[contract_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['state'], 'funds_locked')

        # 5. Submit work (as payee)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.payee_token.key)
        response = self.client.post(reverse('contract-submit-work', args=[contract_id]), {
            'description': 'Here is the completed work'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['state'], 'work_submitted')

        # 6. Approve (as payer)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.payer_token.key)
        response = self.client.post(reverse('contract-approve', args=[contract_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['state'], 'completed')
