"""
Agent Orchestrator — chains the three AI agents sequentially.

Flow: User Input → Parser → Risk Assessment → Compliance → Combined Result
"""
import time
import logging
from .agents import parse_contract, assess_risk, check_compliance

logger = logging.getLogger(__name__)


def orchestrate_contract_analysis(user_input):
    """
    Run the full multi-agent pipeline on user input.
    
    Returns a dict with results from each agent plus combined output.
    """
    results = {
        'agents': [],
        'parsed_contract': None,
        'risk_assessment': None,
        'compliance': None,
        'final_contract': None,
    }

    # Agent 1: Parse Contract
    start = time.time()
    parsed = parse_contract(user_input)
    parse_time = round(time.time() - start, 2)
    
    results['parsed_contract'] = parsed
    results['agents'].append({
        'name': 'Contract Parser',
        'status': 'completed',
        'duration_seconds': parse_time,
        'output': parsed,
    })
    logger.info(f"[Orchestrator] Parser completed in {parse_time}s")

    # Agent 2: Risk Assessment
    start = time.time()
    risk = assess_risk(parsed)
    risk_time = round(time.time() - start, 2)
    
    results['risk_assessment'] = risk
    results['agents'].append({
        'name': 'Risk Assessment',
        'status': 'completed',
        'duration_seconds': risk_time,
        'output': risk,
    })
    logger.info(f"[Orchestrator] Risk Assessment completed in {risk_time}s")

    # Agent 3: Compliance
    start = time.time()
    compliance = check_compliance(parsed, risk)
    compliance_time = round(time.time() - start, 2)
    
    results['compliance'] = compliance
    results['agents'].append({
        'name': 'Compliance Check',
        'status': 'completed',
        'duration_seconds': compliance_time,
        'output': compliance,
    })
    logger.info(f"[Orchestrator] Compliance completed in {compliance_time}s")

    # Combine into final contract structure
    results['final_contract'] = {
        'title': parsed.get('title', ''),
        'description': compliance.get('improved_description', parsed.get('description', '')),
        'total_amount': parsed.get('total_amount', 0),
        'milestones': parsed.get('milestones', []),
        'deadline': parsed.get('deadline', ''),
        'deliverables': parsed.get('deliverables', []),
        'payment_terms': parsed.get('payment_terms', ''),
        'risk_score': risk.get('risk_score', 0),
        'risk_level': risk.get('risk_level', 'low'),
        'risk_flags': risk.get('flags', []),
        'compliance_status': 'compliant' if compliance.get('is_compliant') else 'needs_review',
        'suggested_terms': compliance.get('suggested_terms', {}),
        'recommendations': (
            risk.get('recommendations', []) + 
            compliance.get('final_recommendations', [])
        ),
    }

    return results
