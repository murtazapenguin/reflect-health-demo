from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from app.config import get_settings
from app.models.call_record import CallRecord

router = APIRouter()


class TranscriptEntry(BaseModel):
    speaker: str
    text: str


class SaveConversationRequest(BaseModel):
    conversation_id: Optional[str] = None
    transcript: List[TranscriptEntry] = []
    duration_seconds: int = 0
    tool_calls: List[Dict[str, Any]] = []


def _extract_data_from_tool_calls(tool_calls: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Parse tool call results from the ElevenLabs conversation to build extracted_data,
    mirroring what Bland webhooks provide."""
    extracted: Dict[str, Any] = {}
    for tc in tool_calls:
        name = tc.get("tool_name", tc.get("name", ""))
        params = tc.get("params", tc.get("arguments", {}))
        result = tc.get("result", tc.get("response", {}))
        if isinstance(result, str):
            try:
                import json
                result = json.loads(result)
            except (ValueError, TypeError):
                result = {}

        if "npi" in name.lower() or "authenticate" in name.lower():
            extracted["npi"] = params.get("npi")
            extracted["valid"] = result.get("valid", False)
            extracted["provider_name"] = result.get("provider_name")
            extracted["practice_name"] = result.get("practice_name")
        elif "zip" in name.lower() or "verify" in name.lower():
            extracted["zip_verified"] = result.get("verified", False)
            if result.get("provider_name"):
                extracted["provider_name"] = result["provider_name"]
        elif "eligibility" in name.lower():
            extracted["call_intent"] = "eligibility"
            extracted["found"] = result.get("found", False)
            extracted["patient_name"] = result.get("patient_name")
            extracted["member_id"] = result.get("member_id")
            extracted["status"] = result.get("status")
            extracted["plan_name"] = result.get("plan_name")
            extracted["copay_primary"] = result.get("copay_primary")
            extracted["copay_specialist"] = result.get("copay_specialist")
            extracted["deductible"] = result.get("deductible")
            extracted["deductible_met"] = result.get("deductible_met")
            if result.get("service_type"):
                extracted["service_type"] = result["service_type"]
                extracted["service_covered"] = result.get("service_covered")
                extracted["service_copay"] = result.get("service_copay")
                extracted["service_prior_auth"] = result.get("service_prior_auth")
        elif "claim" in name.lower():
            extracted["call_intent"] = "claims"
            extracted["found"] = result.get("found", False)
            extracted["claim_number"] = result.get("claim_number") or params.get("claim_number")
            extracted["claim_status"] = result.get("status")
            extracted["billed_amount"] = result.get("billed_amount")
            extracted["paid_amount"] = result.get("paid_amount")
            extracted["patient_responsibility"] = result.get("patient_responsibility")
            extracted["denial_code"] = result.get("denial_code")
            extracted["denial_reason"] = result.get("denial_reason")
        elif "prior" in name.lower() or "auth" in name.lower():
            extracted["call_intent"] = "prior_auth"
            extracted["found"] = result.get("found", False)
            extracted["pa_id"] = result.get("pa_id") or params.get("pa_id")
            extracted["pa_status"] = result.get("status")
            extracted["service_description"] = result.get("service_description")
            extracted["denial_reason"] = result.get("denial_reason")

    return {k: v for k, v in extracted.items() if v is not None}


def _determine_intent_from_extracted(extracted: Dict[str, Any], transcript_text: str) -> str:
    intent = extracted.get("call_intent", "")
    if intent:
        return intent
    lower = transcript_text.lower()
    if "eligib" in lower or "coverage" in lower:
        return "eligibility"
    if "claim" in lower:
        return "claims"
    if "prior auth" in lower:
        return "prior_auth"
    return "general"


def _determine_outcome_from_extracted(extracted: Dict[str, Any], transcript_text: str) -> str:
    if "transfer" in transcript_text.lower():
        return "transferred"
    found = extracted.get("found")
    if found is True or str(found).lower() == "true":
        return "resolved"
    if found is False or str(found).lower() == "false":
        return "not_found"
    return "resolved"


@router.get("/token", summary="Get ElevenLabs conversation token")
async def get_conversation_token():
    """Generate a signed URL for ElevenLabs Conversational AI WebSocket connection.

    Keeps the API key server-side -- the frontend never sees it.
    """
    settings = get_settings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
        )

    url = (
        f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
        f"?agent_id={settings.elevenlabs_agent_id}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                url,
                headers={"xi-api-key": settings.elevenlabs_api_key},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("ElevenLabs signed URL generated for agent {}", settings.elevenlabs_agent_id)
            return {"signed_url": data["signed_url"]}
    except httpx.HTTPStatusError as e:
        logger.error("ElevenLabs API error: {} {}", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Failed to get ElevenLabs token")
    except Exception as e:
        logger.error("ElevenLabs token error: {}", str(e))
        raise HTTPException(status_code=502, detail="Failed to get ElevenLabs token")


@router.post("/save-conversation", summary="Save ElevenLabs conversation to call log")
async def save_conversation(body: SaveConversationRequest):
    """Persist an ElevenLabs conversation as a CallRecord so it appears
    in the Call Log alongside Bland calls."""
    now = datetime.now(timezone.utc)
    call_id = f"el_{body.conversation_id or uuid4().hex[:12]}"

    existing = await CallRecord.find_one(CallRecord.call_id == call_id)
    if existing:
        logger.info("ElevenLabs conversation {} already saved, skipping", call_id)
        return {"call_id": existing.call_id, "status": "already_exists"}

    transcript_entries = [
        {"speaker": "AI" if e.speaker == "agent" else "Provider", "text": e.text}
        for e in body.transcript
    ]

    extracted = _extract_data_from_tool_calls(body.tool_calls)
    transcript_text = " ".join(e.text for e in body.transcript)
    intent = _determine_intent_from_extracted(extracted, transcript_text)
    outcome = _determine_outcome_from_extracted(extracted, transcript_text)

    tags = ["elevenlabs", intent]
    if outcome == "resolved":
        tags.append("auto-resolved")
    elif outcome == "transferred":
        tags.append("transferred")
    elif outcome == "not_found":
        tags.append("not-found")

    record = CallRecord(
        call_id=call_id,
        phone_from="in-browser",
        phone_to="ElevenLabs Agent",
        started_at=now - timedelta(seconds=body.duration_seconds),
        ended_at=now,
        duration_seconds=body.duration_seconds,
        intent=intent,
        outcome=outcome,
        provider_npi=extracted.get("npi"),
        provider_name=extracted.get("provider_name"),
        patient_name=extracted.get("patient_name"),
        transcript=transcript_entries,
        tags=tags,
        flagged=False,
        transferred=outcome == "transferred",
        auth_success=extracted.get("valid"),
        extracted_data=extracted,
    )
    await record.insert()
    logger.info("ElevenLabs conversation saved: {} intent={} outcome={}", call_id, intent, outcome)
    return {"call_id": call_id, "status": "saved"}
