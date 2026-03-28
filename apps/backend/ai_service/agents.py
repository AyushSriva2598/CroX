"""
Multi-Agent AI System for Contract Analysis.

Three specialized agents orchestrated sequentially:
1. Contract Parser Agent — natural language → structured terms
2. Risk Assessment Agent — analyzes for red flags
3. Compliance Agent — checks escrow rules, suggests improvements

Each agent has its own system prompt and returns structured JSON.
Falls back to mock responses if OpenAI API key is not configured.
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


def _get_client():
    """Get OpenAI client if API key is configured."""
    api_key = settings.OPENAI_API_KEY
    if not api_key or not HAS_OPENAI:
        return None
    return OpenAI(api_key=api_key)


def _call_agent(client, system_prompt, user_message, agent_name):
    """Call an AI agent with the given prompts. Falls back to mock if no client."""
    if not client:
        logger.info(f"[{agent_name}] No OpenAI client — using mock response")
        return None

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1000,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"[{agent_name}] Error: {e}")
        return None


# ============================================================
# AGENT 1: Contract Parser
# ============================================================

PARSER_SYSTEM_PROMPT = """You are a Contract Parser Agent for TrustLayer, a UPI-native escrow platform.

Your job is to extract structured contract terms from natural language descriptions.

Given a user's informal description of a deal or agreement, extract:
- title: A concise contract title
- description: Clear description of the agreement
- total_amount: The monetary value (as a number, in INR)
- milestones: Array of milestone objects, each with {name, amount, description}
- deadline: Expected completion date/timeframe
- deliverables: Array of expected deliverables
- payment_terms: Payment conditions

Return ONLY valid JSON in this exact format:
{
    "title": "string",
    "description": "string", 
    "total_amount": number,
    "milestones": [{"name": "string", "amount": number, "description": "string"}],
    "deadline": "string",
    "deliverables": ["string"],
    "payment_terms": "string"
}

If information is missing, make reasonable assumptions and note them."""


def parse_contract(text):
    """Agent 1: Parse natural language into structured contract."""
    client = _get_client()
    result = _call_agent(client, PARSER_SYSTEM_PROMPT, text, "ContractParser")

    if result:
        return result

    # Mock fallback
    import re
    amount_match = re.search(r'Total amount: ([\d.]+) MON', text)
    total_amount = float(amount_match.group(1)) if amount_match else 50000.0
    half = total_amount / 2

    return {
        "title": "Service Agreement",
        "description": text[:200],
        "total_amount": total_amount,
        "milestones": [
            {"name": "Initial Delivery", "amount": half, "description": "First phase of work"},
            {"name": "Final Delivery", "amount": half, "description": "Final phase with revisions"},
        ],
        "deadline": "30 days from acceptance",
        "deliverables": ["Project deliverable as described"],
        "payment_terms": "Full payment locked in escrow upon acceptance"
    }


# ============================================================
# AGENT 2: Risk Assessment
# ============================================================

RISK_SYSTEM_PROMPT = """You are a Risk Assessment Agent for TrustLayer, a UPI-native escrow platform.

You analyze structured contract terms and identify potential risks and red flags.

For each contract, assess:
- risk_score: 0-100 (0 = very safe, 100 = extremely risky)
- risk_level: "low" | "medium" | "high" | "critical"
- flags: Array of risk flags, each with {type, severity, message}
  - Types: "amount_anomaly", "missing_clause", "unfair_terms", "vague_terms", "timeline_risk", "no_milestones"
  - Severity: "info", "warning", "critical"
- recommendations: Array of strings with suggestions to mitigate risks

Return ONLY valid JSON in this format:
{
    "risk_score": number,
    "risk_level": "string",
    "flags": [{"type": "string", "severity": "string", "message": "string"}],
    "recommendations": ["string"]
}

Be thorough but practical. Focus on protecting both payer and payee."""


def assess_risk(parsed_contract):
    """Agent 2: Assess risk of parsed contract terms."""
    client = _get_client()
    result = _call_agent(
        client,
        RISK_SYSTEM_PROMPT,
        json.dumps(parsed_contract, indent=2),
        "RiskAssessment"
    )

    if result:
        return result

    # Mock fallback
    amount = parsed_contract.get('total_amount', 0)
    flags = []
    risk_score = 25

    if amount > 100000:
        flags.append({"type": "amount_anomaly", "severity": "warning", "message": "High-value contract — consider milestones"})
        risk_score += 20

    if not parsed_contract.get('milestones'):
        flags.append({"type": "no_milestones", "severity": "warning", "message": "No milestones defined — consider breaking into phases"})
        risk_score += 15

    if not parsed_contract.get('deadline'):
        flags.append({"type": "timeline_risk", "severity": "info", "message": "No deadline specified"})
        risk_score += 10

    return {
        "risk_score": min(risk_score, 100),
        "risk_level": "low" if risk_score < 30 else "medium" if risk_score < 60 else "high",
        "flags": flags or [{"type": "info", "severity": "info", "message": "No significant risks detected"}],
        "recommendations": [
            "Consider adding milestones for payments above ₹50,000",
            "Define clear deliverables and acceptance criteria",
            "Set a reasonable deadline for dispute resolution"
        ]
    }


# ============================================================
# AGENT 3: Compliance
# ============================================================

COMPLIANCE_SYSTEM_PROMPT = """You are a Compliance Agent for TrustLayer, a UPI-native escrow platform.

You review contract terms and risk assessment to ensure the contract can work within TrustLayer's escrow system.

Check for:
1. Escrow compatibility — can the amounts be properly locked and released?
2. Milestone validity — do milestones sum to total? Are they reasonable?
3. Terms clarity — are terms specific enough for dispute resolution?
4. Suggested improvements — what would make this contract safer?

Return ONLY valid JSON:
{
    "is_compliant": boolean,
    "compliance_issues": [{"issue": "string", "suggestion": "string"}],
    "suggested_terms": {
        "auto_release_days": number,
        "dispute_window_days": number,
        "revision_rounds": number
    },
    "improved_description": "string",
    "final_recommendations": ["string"]
}"""


def check_compliance(parsed_contract, risk_assessment):
    """Agent 3: Check compliance and suggest improvements."""
    client = _get_client()
    combined_input = json.dumps({
        "contract": parsed_contract,
        "risk_assessment": risk_assessment,
    }, indent=2)

    result = _call_agent(client, COMPLIANCE_SYSTEM_PROMPT, combined_input, "Compliance")

    if result:
        return result

    # Mock fallback
    milestones = parsed_contract.get('milestones', [])
    total = parsed_contract.get('total_amount', 0)
    milestone_sum = sum(m.get('amount', 0) for m in milestones)

    issues = []
    if milestones and milestone_sum != total:
        issues.append({
            "issue": f"Milestone amounts ({milestone_sum}) don't sum to total ({total})",
            "suggestion": "Adjust milestone amounts to match the total contract value"
        })

    return {
        "is_compliant": len(issues) == 0,
        "compliance_issues": issues,
        "suggested_terms": {
            "auto_release_days": 7,
            "dispute_window_days": 3,
            "revision_rounds": 2,
        },
        "improved_description": parsed_contract.get('description', ''),
        "final_recommendations": [
            "Lock funds in escrow before work begins",
            "Set up milestone-based releases for larger contracts",
            "Both parties should agree to terms before funding",
        ]
    }
