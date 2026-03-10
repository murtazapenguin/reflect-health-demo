"""Automated accuracy scoring for call records."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.models.call_record import CallRecord

INTENT_KEYWORDS = {
    "eligibility": ["eligib", "coverage", "benefit", "copay", "deductible", "plan", "active", "enrolled"],
    "claims": ["claim", "paid", "denied", "billed", "reprocess", "appeal", "status"],
    "prior_auth": ["prior auth", "authorization", "pre-cert", "approval"],
}

ELIGIBILITY_FIELDS = {"plan_name", "status", "copay_primary", "deductible", "out_of_pocket_max"}
CLAIMS_FIELDS = {"claim_number", "claim_status", "billed_amount", "paid_amount"}


def _score_verification(data: Dict[str, Any], transcript: List[Dict[str, Any]]) -> int:
    checks = []

    if "valid" in data:
        checks.append(100 if data["valid"] in (True, "true", "True") else 0)

    if "zip_verified" in data:
        checks.append(100 if data["zip_verified"] in (True, "true", "True") else 0)

    if "member_verified" in data:
        checks.append(100 if data["member_verified"] in (True, "true", "True") else 0)

    if not checks:
        return 100 if any("verified" in str(e.get("text", "")).lower() for e in transcript if e.get("speaker") == "AI") else 50

    return round(sum(checks) / len(checks))


def _score_data_retrieval(data: Dict[str, Any], intent: str) -> int:
    if data.get("found") in (False, "false", "False"):
        return 30

    if data.get("found") in (True, "true", "True"):
        expected = set()
        if intent == "eligibility":
            expected = ELIGIBILITY_FIELDS
        elif intent == "claims":
            expected = CLAIMS_FIELDS

        if not expected:
            return 90

        present = sum(1 for f in expected if data.get(f) is not None)
        completeness = present / len(expected)
        return round(40 + 60 * completeness)

    if "call_intent" in data or intent:
        return 60

    return 50


def _score_intent(record_intent: str, transcript: List[Dict[str, Any]]) -> int:
    if not record_intent or record_intent == "unknown":
        return 40

    caller_text = " ".join(
        e.get("text", "") for e in transcript
        if e.get("speaker") in ("Caller", "User", "user")
    ).lower()

    if not caller_text:
        return 60

    keywords = INTENT_KEYWORDS.get(record_intent, [])
    if not keywords:
        return 70

    matches = sum(1 for kw in keywords if kw in caller_text)
    if matches >= 2:
        return 100
    if matches == 1:
        return 85

    for other_intent, other_kws in INTENT_KEYWORDS.items():
        if other_intent == record_intent:
            continue
        other_matches = sum(1 for kw in other_kws if kw in caller_text)
        if other_matches >= 2:
            return 30

    return 60


def _score_response(record: CallRecord) -> int:
    data = record.extracted_data
    transcript = record.transcript

    ai_text = " ".join(
        e.get("text", "") for e in transcript
        if e.get("speaker") == "AI"
    ).lower()

    if not ai_text:
        return 50

    if record.transferred:
        if record.transfer_reason:
            return 90
        if any(phrase in ai_text for phrase in ["transfer", "connect you", "team member"]):
            return 80
        return 60

    if record.outcome != "resolved":
        return 50

    values_to_check = []
    for key in ("copay_primary", "copay_specialist", "deductible", "paid_amount",
                "billed_amount", "patient_responsibility"):
        val = data.get(key)
        if val is not None:
            values_to_check.append(str(val))

    for key in ("claim_status", "status", "plan_name"):
        val = data.get(key)
        if val is not None:
            values_to_check.append(str(val).lower())

    if not values_to_check:
        return 75

    found = sum(1 for v in values_to_check if v in ai_text)
    ratio = found / len(values_to_check)

    return round(50 + 50 * ratio)


def _spot_check_hallucinations(data: Dict[str, Any], transcript: List[Dict[str, Any]]) -> List[str]:
    """Compare key data points the agent spoke against tool-call results.
    Returns a list of mismatch descriptions (empty = no hallucinations detected)."""
    ai_text = " ".join(
        e.get("text", "") for e in transcript if e.get("speaker") == "AI"
    ).lower()

    if not ai_text:
        return []

    flags: List[str] = []

    dollar_fields = {
        "copay_primary": "copay",
        "copay_specialist": "specialist copay",
        "deductible": "deductible",
        "paid_amount": "paid amount",
        "billed_amount": "billed amount",
        "patient_responsibility": "patient responsibility",
    }
    for field, label in dollar_fields.items():
        value = data.get(field)
        if value is None:
            continue
        str_val = str(value)
        formatted_val = f"${value:,.2f}" if isinstance(value, (int, float)) else str_val
        alt_formatted = f"${value:,.0f}" if isinstance(value, (int, float)) else str_val
        if str_val not in ai_text and formatted_val.lower() not in ai_text and alt_formatted.lower() not in ai_text:
            if any(w in ai_text for w in [label, field.replace("_", " ")]):
                flags.append(f"{label}: tool returned {formatted_val} but agent may have stated a different amount")

    status_fields = {"claim_status": "claim status", "status": "member status"}
    for field, label in status_fields.items():
        value = data.get(field)
        if value and isinstance(value, str) and value.lower() not in ai_text:
            if any(w in ai_text for w in ["status", "claim"]):
                flags.append(f"{label}: tool returned '{value}' but agent may have stated a different status")

    return flags


def compute_accuracy_scores(record: CallRecord) -> Dict[str, Any]:
    data = record.extracted_data or {}
    transcript = record.transcript or []
    intent = record.intent or data.get("call_intent", "unknown") or "unknown"

    verification = _score_verification(data, transcript)
    data_retrieval = _score_data_retrieval(data, intent)
    intent_score = _score_intent(intent, transcript)
    response = _score_response(record)

    overall = round(
        verification * 0.25
        + data_retrieval * 0.25
        + intent_score * 0.25
        + response * 0.25
    )

    hallucination_flags = _spot_check_hallucinations(data, transcript)

    return {
        "verification_score": verification,
        "data_retrieval_score": data_retrieval,
        "intent_score": intent_score,
        "response_score": response,
        "overall_auto_score": overall,
        "hallucination_flags": hallucination_flags,
        "hallucination_count": len(hallucination_flags),
        "scored_at": datetime.now(timezone.utc).isoformat(),
    }
