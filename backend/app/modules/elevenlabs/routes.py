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

    last_data = None
    for attempt in range(6):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    url,
                    headers={"xi-api-key": settings.elevenlabs_api_key},
                )
                if resp.status_code == 404:
                    logger.info("ElevenLabs conversation {} not found yet (attempt {})", conversation_id, attempt + 1)
                    await asyncio.sleep(3 * (attempt + 1))
                    continue
                resp.raise_for_status()
                data = resp.json()
                last_data = data
                status = data.get("status", "")
                logger.info(
                    "ElevenLabs conversation {} attempt={} status='{}' transcript_len={} keys={}",
                    conversation_id, attempt + 1, status,
                    len(data.get("transcript") or []),
                    list(data.keys()),
                )
                if status in ("done", "failed"):
                    return data
                await asyncio.sleep(3 * (attempt + 1))
        except Exception as e:
            logger.warning("ElevenLabs conversation fetch error (attempt {}): {}", attempt + 1, e)
            await asyncio.sleep(3)

    if last_data:
        logger.warning("Returning ElevenLabs conversation {} with status='{}' after all retries",
                        conversation_id, last_data.get("status"))
        return last_data
    return None


def _extract_data_from_conversation(details: Dict[str, Any]) -> Dict[str, Any]:
    """Parse the full conversation detail to build extracted_data."""
    extracted: Dict[str, Any] = {}
    transcript = details.get("transcript") or []

    logger.info("Parsing ElevenLabs transcript: {} entries", len(transcript))
    for i, entry in enumerate(transcript):
        role = entry.get("role", "")
        logger.debug("  transcript[{}] role='{}' keys={}", i, role, list(entry.keys()))

    pending_calls: Dict[str, Dict] = {}

    for entry in transcript:
        role = entry.get("role", "")

        # Detect tool call entries (various formats ElevenLabs may use)
        if role in ("tool_call", "tool-call") or entry.get("tool_name"):
            call_id = entry.get("tool_call_id", entry.get("id", ""))
            tool_name = entry.get("tool_name", entry.get("name", ""))
            params = entry.get("tool_input", entry.get("parameters", entry.get("params", entry.get("arguments", {}))))
            if isinstance(params, str):
                try:
                    params = json.loads(params)
                except (ValueError, TypeError):
                    params = {}
            pending_calls[call_id] = {"tool_name": tool_name, "params": params or {}}
            logger.info("  Tool call: id='{}' name='{}' params={}", call_id, tool_name, params)

        # Detect tool result entries
        if role in ("tool_result", "tool-result", "tool_response") or (
            entry.get("tool_call_id") and (entry.get("output") or entry.get("tool_output") or entry.get("result"))
        ):
            call_id = entry.get("tool_call_id", entry.get("id", ""))
            tc = pending_calls.get(call_id, {})
            name = tc.get("tool_name", entry.get("tool_name", entry.get("name", ""))).lower()
            params = tc.get("params", {})

            raw_output = entry.get("output", entry.get("tool_output", entry.get("result", "")))
            if isinstance(raw_output, str):
                try:
                    result = json.loads(raw_output)
                except (ValueError, TypeError):
                    result = {"raw": raw_output}
            elif isinstance(raw_output, dict):
                result = raw_output
            else:
                result = {}

            logger.info("  Tool result: id='{}' name='{}' result_keys={}", call_id, name, list(result.keys()) if isinstance(result, dict) else str(result)[:100])
            _merge_tool_result(extracted, name, params, result)

    # Also check the analysis/data_collection fields ElevenLabs provides
    analysis = details.get("analysis", {}) or {}
    if analysis.get("call_successful") is not None:
        extracted.setdefault("call_successful", analysis["call_successful"])
    data_collected = analysis.get("data_collection") or {}
    for k, v in data_collected.items():
        if v is not None:
            extracted.setdefault(k, v)

    logger.info("Extracted data keys: {}", list(extracted.keys()))
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


def _extract_names_from_transcript(agent_text: str, extracted: Dict[str, Any]) -> None:
    """Fallback: pull provider/patient names from agent speech if not in tool results."""
    import re

    if not extracted.get("provider_name"):
        patterns = [
            r"(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
            r"verified.*?(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
            r"(?:Hello|Hi),?\s+(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        ]
        for pat in patterns:
            m = re.search(pat, agent_text)
            if m:
                extracted["provider_name"] = f"Dr. {m.group(1)}"
                break

    if not extracted.get("patient_name"):
        patterns = [
            r"(?:patient|member)\s+(?:named?\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)",
            r"(?:record|information|details)\s+(?:for|of)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)",
            r"(?:found|see|have|showing)\s+(?:a\s+)?(?:record|result|info|data)?\s*(?:for)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)",
        ]
        for pat in patterns:
            m = re.search(pat, agent_text)
            if m:
                name = m.group(1)
                if name.lower() not in ("the patient", "your patient", "this patient"):
                    extracted["patient_name"] = name
                    break


def _detect_auth_success(
    extracted: Dict[str, Any],
    agent_text: str,
) -> Optional[bool]:
    """Determine auth status from extracted data or agent transcript."""
    valid = extracted.get("valid")
    if valid is not None:
        return bool(valid) if isinstance(valid, bool) else str(valid).lower() == "true"

    lower = agent_text.lower()
    if "you're verified" in lower or "you are verified" in lower or "verification complete" in lower:
        return True
    if "zip verified" in lower or "zip confirmed" in lower:
        return True
    # Agent addressed the provider by name after auth → likely authenticated
    if extracted.get("provider_name") and extracted["provider_name"].lower() in lower:
        return True
    if "wasn't able to validate" in lower or "unable to verify" in lower or "invalid npi" in lower:
        return False
    return None


def _split_transcript_by_role(
    transcript_entries: List[Dict],
) -> tuple[str, str]:
    """Split transcript into user-only and agent-only text."""
    user_parts = []
    agent_parts = []
    for e in transcript_entries:
        speaker = (e.get("speaker") or "").lower()
        text = e.get("text", "")
        if speaker in ("provider", "user"):
            user_parts.append(text)
        elif speaker in ("ai", "agent", "assistant"):
            agent_parts.append(text)
    return " ".join(user_parts), " ".join(agent_parts)


def _determine_intent(
    extracted: Dict[str, Any],
    user_text: str,
    full_text: str,
) -> str:
    intent = extracted.get("call_intent", "")
    if intent:
        return intent
    # Check user messages first for what they actually asked about
    lower = user_text.lower()
    if "prior auth" in lower or "authorization" in lower:
        return "prior_auth"
    if "claim" in lower:
        return "claims"
    if "eligib" in lower or "coverage" in lower:
        return "eligibility"
    # Fall back to full transcript (less reliable due to agent greetings)
    full_lower = full_text.lower()
    if "prior auth" in full_lower or "authorization" in full_lower:
        return "prior_auth"
    if "claim" in full_lower:
        return "claims"
    if "eligib" in full_lower or "coverage" in full_lower:
        return "eligibility"
    return "general"


def _determine_outcome(
    extracted: Dict[str, Any],
    agent_text: str,
) -> str:
    lower = agent_text.lower()
    if "connect you with" in lower or "transfer" in lower or "team member" in lower or "human agent" in lower:
        return "transferred"
    found = extracted.get("found")
    if found is True or str(found).lower() == "true":
        return "resolved"
    if found is False or str(found).lower() == "false":
        return "not_found"
    return "resolved"


def _detect_transfer_reason(
    user_text: str,
    agent_text: str,
) -> Optional[str]:
    user_lower = user_text.lower()

    # Check if the USER expressed frustration
    frustration_keywords = [
        "already told you", "this isn't working", "not working", "ridiculous",
        "talk to someone", "talk to a person", "speak to someone", "let me talk",
        "this is frustrating", "waste of time", "unacceptable",
    ]
    if any(kw in user_lower for kw in frustration_keywords):
        return "Caller expressed frustration — escalated to human agent"

    # Check if user asked for something out of scope
    scope_keywords = [
        "submit", "file a new", "create a new", "new prior auth",
        "submit a prior", "file an appeal", "update my", "change my",
    ]
    if any(kw in user_lower for kw in scope_keywords):
        return "Request outside AI scope — transferred to human agent"

    # Check if auth failed
    agent_lower = agent_text.lower()
    if "wasn't able to validate" in agent_lower or "unable to verify" in agent_lower:
        return "Authentication failed — transferred to human agent"

    # Generic transfer
    if "connect you with" in agent_lower or "team member" in agent_lower:
        return "Transferred to human agent"
    return None


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
            logger.info("Fetched ElevenLabs conversation details for {} — top-level keys: {}", body.conversation_id, list(details.keys()))
            raw_transcript = details.get("transcript") or []
            for i, entry in enumerate(raw_transcript[:30]):
                logger.info("  raw[{}] role='{}' keys={}", i, entry.get("role", "?"), list(entry.keys()))
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

    user_text, agent_text = _split_transcript_by_role(transcript_entries)

    # Fallback: extract names from spoken transcript if tool results didn't provide them
    _extract_names_from_transcript(agent_text, extracted)

    intent = _determine_intent(extracted, user_text, transcript_text)
    outcome = _determine_outcome(extracted, agent_text)

    is_transferred = outcome == "transferred"
    transfer_reason = _detect_transfer_reason(user_text, agent_text) if is_transferred else None

    tags = ["elevenlabs", intent]
    if outcome == "resolved":
        tags.append("auto-resolved")
    elif outcome == "transferred":
        tags.append("escalation")
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
        flagged=is_transferred,
        transferred=is_transferred,
        transfer_reason=transfer_reason,
        source="elevenlabs",
        auth_success=_detect_auth_success(extracted, agent_text),
        extracted_data=extracted,
    )
    await record.insert()
    logger.info(
        "ElevenLabs conversation saved: {} intent={} outcome={} provider='{}' patient='{}' extracted_keys={}",
        call_id, intent, outcome,
        extracted.get("provider_name"), extracted.get("patient_name"),
        list(extracted.keys()),
    )
    return {"call_id": call_id, "status": "saved"}
