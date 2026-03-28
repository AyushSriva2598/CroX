"""
Contract State Machine — enforces deterministic state transitions.
No direct DB updates allowed; all transitions go through this module.
"""
from .models import AuditLog


class InvalidTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


# Valid transitions: {current_state: {action: new_state}}
TRANSITIONS = {
    'draft': {
        'submit': 'pending_acceptance',
        'cancel': 'cancelled',
    },
    'pending_acceptance': {
        'accept': 'active',
        'reject': 'cancelled',
        'cancel': 'cancelled',
    },
    'active': {
        'pay': 'funds_locked',
        'cancel': 'cancelled',
    },
    'funds_locked': {
        'submit_work': 'work_submitted',
        'dispute': 'disputed',
        'cancel': 'cancelled',
    },
    'work_submitted': {
        'approve': 'completed',
        'dispute': 'disputed',
    },
    'disputed': {
        'resolve_release': 'completed',
        'resolve_refund': 'refunded',
        'resolve_split': 'resolved',
    },
    'resolved': {},
    'completed': {},
    'cancelled': {},
    'refunded': {},
}


def get_available_actions(contract):
    """Return list of valid actions for the contract's current state."""
    return list(TRANSITIONS.get(contract.state, {}).keys())


def transition(contract, action, performed_by=None, metadata=None):
    """
    Execute a state transition on a contract.
    
    Args:
        contract: Contract instance
        action: string action (e.g., 'accept', 'pay', 'dispute')
        performed_by: User who performed the action
        metadata: optional dict with extra info
    
    Returns:
        The updated contract
    
    Raises:
        InvalidTransitionError if the transition is not valid
    """
    current_state = contract.state
    valid_transitions = TRANSITIONS.get(current_state, {})

    if action not in valid_transitions:
        available = list(valid_transitions.keys()) or ['(none — terminal state)']
        raise InvalidTransitionError(
            f"Cannot perform '{action}' on contract in state '{current_state}'. "
            f"Valid actions: {available}"
        )

    new_state = valid_transitions[action]
    
    # Handle partial milestone looping
    if current_state == 'work_submitted' and action == 'approve':
        milestones = contract.terms.get('milestones', [])
        if milestones and contract.current_milestone < len(milestones) - 1:
            new_state = 'funds_locked'

    old_state = contract.state
    contract.state = new_state
    contract.save(update_fields=['state', 'updated_at'])

    # Log the transition
    AuditLog.objects.create(
        entity_type='contract',
        entity_id=contract.id,
        action=action,
        old_state=old_state,
        new_state=new_state,
        performed_by=performed_by,
        metadata=metadata or {},
    )

    return contract
