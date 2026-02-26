import asyncio
import json
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


async def _fetch_conversation_details(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Fetch full conversation details from ElevenLabs API, including tool calls."""
    settings = get_settings()
    if not settings.elevenlabs_api_key or not conversation_id:
        return None

    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"

    for attempt in range(4):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    url,
                    headers={"xi-api-key": settings.elevenlabs_api_key},
                )
                if resp.status_code == 404:
                    logger.info("ElevenLabs conversation {} not found yet (attempt {})", conversation_id, attempt + 1)
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                resp.raise_for_status()
                data = resp.json()
                status = data.get("status", "")
                if status in ("done", "failed"):
                    return data
                logger.info("ElevenLabs conversation {} status='{}', waiting...", conversation_id, status)
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.warning("ElevenLabs conversation fetch error (attempt {}): {}", attempt + 1, e)
            await asyncio.sleep(2)

    return None


def _extract_tool_calls_from_details(details: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract tool call entries from the ElevenLabs conversation detail response."""
    tool_calls = []
    transcript = details.get("transcript") or []
    for entry in transcript:
        role = entry.get("role", "")
        if role == "tool_call" or entry.get("tool_name"):
            tool_calls.append(entry)
        if role == "tool_result" or entry.get("tool_call_id"):
            tool_calls.append(entry)
    return tool_calls


def _extract_data_from_conversation(details: Dict[str, Any]) -> Dict[str, Any]:
    """Parse the full conversation detail to build extracted_data."""
    extracted: Dict[str, Any] = {}
    transcript = details.get("transcript") or []

    pending_calls: Dict[str, Dict] = {}

    for entry in transcript:
        role = entry.get("role", "")

        if role == "tool_call" or entry.get("tool_name"):
            call_id = entry.get("tool_call_id", "")
            pending_calls[call_id] = {
                "tool_name": entry.get("tool_name", ""),
                "params": entry.get("tool_input", entry.get("parameters", {})),
            }

        if role == "tool_result" or (entry.get("tool_call_id") and entry.get("output")):
            call_id = entry.get("tool_call_id", "")
            tc = pending_calls.get(call_id, {})
            name = tc.get("tool_name", entry.get("tool_name", "")).lower()
            params = tc.get("params", {})

            raw_output = entry.get("output", entry.get("tool_output", ""))
            if isinstance(raw_output, str):
                try:
                    result = json.loads(raw_output)
                except (ValueError, TypeError):
                    result = {"raw": raw_output}
            elif isinstance(raw_output, dict):
                result = raw_output
            else:
                result = {}

            _merge_tool_result(extracted, name, params, result)

    # Also check the analysis/data_collection fields ElevenLabs provides
    analysis = details.get("analysis", {}) or {}
    if analysis.get("call_successful") is not None:
        extracted.setdefault("call_successful", analysis["call_successful"])
    data_collected = analysis.get("data_collection") or {}
    for k, v in data_collected.items():
        if v is not None:
            extracted.setdefault(k, v)

    return {k: v for k, v in extracted.items() if v is not None}


def _merge_tool_result(extracted: Dict, name: str, params: Dict, result: Dict):
    """Merge a single tool call result into extracted data."""
    if "npi" in name or "authenticate" in name:
        extracted["npi"] = params.get("npi")
        extracted["valid"] = result.get("valid", False)
        extracted["provider_name"] = result.get("provider_name")
        extracted["practice_name"] = result.get("practice_name")
    elif "zip" in name or "verify" in name:
        extracted["zip_verified"] = result.get("verified", False)
        if result.get("provider_name"):
            extracted["provider_name"] = result["provider_name"]
    elif "eligibility" in name:
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
        extracted["out_of_pocket_max"] = result.get("out_of_pocket_max")
        extracted["out_of_pocket_met"] = result.get("out_of_pocket_met")
        if result.get("service_type"):
            extracted["service_type"] = result["service_type"]
            extracted["service_covered"] = result.get("service_covered")
            extracted["service_copay"] = result.get("service_copay")
            extracted["service_coinsurance"] = result.get("service_coinsurance")
            extracted["service_prior_auth"] = result.get("service_prior_auth")
            extracted["service_visit_limit"] = result.get("service_visit_limit")
            extracted["service_notes"] = result.get("service_notes")
    elif "claim" in name:
        extracted["call_intent"] = "claims"
        extracted["found"] = result.get("found", False)
        extracted["claim_number"] = result.get("claim_number") or params.get("claim_number")
        extracted["claim_status"] = result.get("status")
        extracted["billed_amount"] = result.get("billed_amount")
        extracted["allowed_amount"] = result.get("allowed_amount")
        extracted["paid_amount"] = result.get("paid_amount")
        extracted["patient_responsibility"] = result.get("patient_responsibility")
        extracted["check_number"] = result.get("check_number")
        extracted["denial_code"] = result.get("denial_code")
        extracted["denial_reason"] = result.get("denial_reason")
        extracted["appeal_deadline"] = result.get("appeal_deadline")
    elif "prior" in name or ("auth" in name and "authenticate" not in name):
        extracted["call_intent"] = "prior_auth"
        extracted["found"] = result.get("found", False)
        extracted["pa_id"] = result.get("pa_id") or params.get("pa_id")
        extracted["pa_status"] = result.get("status")
        extracted["service_description"] = result.get("service_description")
        extracted["procedure_code"] = result.get("procedure_code")
        extracted["urgency"] = result.get("urgency")
        extracted["approved_units"] = result.get("approved_units")
        extracted["expiration_date"] = result.get("expiration_date")
        extracted["denial_reason"] = result.get("denial_reason")
        extracted["notes"] = result.get("notes")


def _determine_intent(extracted: Dict[str, Any], transcript_text: str) -> str:
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


def _determine_outcome(extracted: Dict[str, Any], transcript_text: str) -> str:
    if "transfer" in transcript_text.lower():
        return "transferred"
    found = extracted.get("found")
    if found is True or str(found).lower() == "true":
        return "resolved"
    if found is False or str(found).lower() == "false":
        return "not_found"
    return "resolved"


@router.get("/config", summary="Get ElevenLabs agent ID")
async def get_config():
    """Return the agent ID for the ElevenLabs widget embed."""
    settings = get_settings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
        )
    return {"agent_id": settings.elevenlabs_agent_id}


@router.get("/token", summary="Get ElevenLabs conversation token")
async def get_conversation_token():
    """Generate a signed URL for ElevenLabs Conversational AI WebSocket connection."""
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
    in the Call Log alongside Bland calls.

    Fetches the full conversation from the ElevenLabs API to get tool call
    data (params + results) for extracted data fields.
    """
    now = datetime.now(timezone.utc)
    call_id = f"el_{body.conversation_id or uuid4().hex[:12]}"

    existing = await CallRecord.find_one(CallRecord.call_id == call_id)
    if existing:
        logger.info("ElevenLabs conversation {} already saved, skipping", call_id)
        return {"call_id": existing.call_id, "status": "already_exists"}

    # Use the local transcript from the frontend as the baseline
    transcript_entries = [
        {"speaker": "AI" if e.speaker == "agent" else "Provider", "text": e.text}
        for e in body.transcript
    ]
    transcript_text = " ".join(e.text for e in body.transcript)

    # Fetch full conversation details from ElevenLabs API for tool call data
    extracted: Dict[str, Any] = {}
    el_transcript_entries: List[Dict] = []

    if body.conversation_id:
        details = await _fetch_conversation_details(body.conversation_id)
        if details:
            logger.info("Fetched ElevenLabs conversation details for {}", body.conversation_id)
            extracted = _extract_data_from_conversation(details)

            # Use ElevenLabs transcript if it has more entries (more complete)
            el_transcript = details.get("transcript") or []
            for entry in el_transcript:
                role = entry.get("role", "")
                message = entry.get("message", "")
                if role in ("agent", "assistant", "ai") and message:
                    el_transcript_entries.append({"speaker": "AI", "text": message})
                elif role in ("user",) and message:
                    el_transcript_entries.append({"speaker": "Provider", "text": message})

            if len(el_transcript_entries) > len(transcript_entries):
                transcript_entries = el_transcript_entries
                transcript_text = " ".join(e.get("text", "") for e in el_transcript_entries)
        else:
            logger.warning("Could not fetch ElevenLabs details for {}", body.conversation_id)

    intent = _determine_intent(extracted, transcript_text)
    outcome = _determine_outcome(extracted, transcript_text)

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
    logger.info("ElevenLabs conversation saved: {} intent={} outcome={} extracted_keys={}",
                call_id, intent, outcome, list(extracted.keys()))
    return {"call_id": call_id, "status": "saved"}
