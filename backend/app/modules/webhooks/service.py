from datetime import datetime, timezone
from typing import Optional

from loguru import logger

from app.models.call_record import CallRecord
from app.modules.webhooks.schemas import BlandCallCompletePayload


def _parse_datetime(dt_str: Optional[str]) -> datetime:
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return datetime.now(timezone.utc)


def _determine_intent(variables: Optional[dict], transcript_text: str) -> str:
    if variables:
        intent = variables.get("call_intent", "").lower()
        if "elig" in intent:
            return "eligibility"
        if "claim" in intent:
            return "claims"
        if "prior" in intent or "auth" in intent:
            return "prior_auth"
        if intent:
            return intent

    text_lower = transcript_text.lower()
    if "eligib" in text_lower or "coverage" in text_lower:
        return "eligibility"
    if "claim" in text_lower or "payment" in text_lower:
        return "claims"
    if "prior auth" in text_lower:
        return "prior_auth"
    return "general"


def _determine_outcome(payload: BlandCallCompletePayload, variables: dict) -> str:
    if payload.transferred_to:
        return "transferred"

    transferred_var = variables.get("transferred")
    if transferred_var is True or str(transferred_var).lower() in ("true", "yes", "1"):
        return "transferred"

    concat = (payload.concatenated_transcript or "").lower()
    if "transfer" in concat and ("let me connect" in concat or "transferring" in concat or "transfer you" in concat or "specialist" in concat):
        return "transferred"

    found_var = variables.get("found")
    status_var = variables.get("status")

    if found_var is not None:
        if str(found_var).lower() in ("true", "1"):
            return "resolved"
        else:
            return "not_found"

    valid_var = variables.get("valid")
    if valid_var is not None and str(valid_var).lower() in ("false", "0"):
        return "auth_failed"

    if payload.status == "completed" and payload.completed:
        if payload.call_length and payload.call_length > 0.5:
            return "resolved"

    return "resolved"


def _build_tags(intent: str, outcome: str, variables: dict) -> list:
    tags = []

    if intent:
        tags.append(intent)

    if outcome == "transferred":
        tags.append("transferred")
    elif outcome == "resolved":
        tags.append("auto-resolved")
    elif outcome == "not_found":
        tags.append("not-found")
    elif outcome == "auth_failed":
        tags.append("auth-failed")

    status = variables.get("status")
    if status:
        status_lower = str(status).lower()
        if status_lower == "denied":
            tags.append("claim-denied")
        elif status_lower == "paid":
            tags.append("claim-paid")
        elif status_lower == "pending":
            tags.append("claim-pending")

    member_status = variables.get("member_status")
    if member_status:
        ms = str(member_status).lower()
        if ms in ("termed", "inactive"):
            tags.append("inactive-member")

    service_type = variables.get("service_type")
    if service_type:
        tags.append("service-check")
        service_covered = variables.get("service_covered")
        if service_covered is not None:
            if str(service_covered).lower() in ("true", "1"):
                tags.append("service-covered")
            elif str(service_covered).lower() in ("false", "0"):
                tags.append("service-not-covered")

    return tags


async def ingest_bland_call(payload: BlandCallCompletePayload) -> CallRecord:
    call_id = payload.effective_call_id
    logger.info("Ingesting Bland call: {}", call_id)

    is_complete = payload.completed is True and payload.status == "completed"

    variables = payload.variables or {}
    transcript_text = payload.concatenated_transcript or ""

    transcript_entries = []
    if payload.transcripts:
        for entry in payload.transcripts:
            speaker_raw = (entry.user or "").lower()
            speaker = "AI" if speaker_raw in ("agent", "assistant", "ai", "bot") else "Provider"
            transcript_entries.append({
                "speaker": speaker,
                "text": entry.text,
                "timestamp": entry.created_at,
            })

    if not transcript_entries and transcript_text:
        logger.info("No structured transcripts, parsing from concatenated_transcript")
        for line in transcript_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.lower().startswith("agent:") or line.lower().startswith("ai:") or line.lower().startswith("assistant:"):
                text = line.split(":", 1)[1].strip()
                transcript_entries.append({"speaker": "AI", "text": text, "timestamp": None})
            elif line.lower().startswith("user:") or line.lower().startswith("caller:") or line.lower().startswith("provider:"):
                text = line.split(":", 1)[1].strip()
                transcript_entries.append({"speaker": "Provider", "text": text, "timestamp": None})
            else:
                transcript_entries.append({"speaker": "Provider", "text": line, "timestamp": None})

    intent = _determine_intent(variables, transcript_text)
    outcome = _determine_outcome(payload, variables)
    transferred = outcome == "transferred"
    tags = _build_tags(intent, outcome, variables)

    provider_npi = variables.get("npi", None)
    provider_name = variables.get("provider_name", None)
    patient_name = variables.get("patient_name", None)
    patient_dob = variables.get("patient_dob", None)

    valid_var = variables.get("valid")
    auth_success = None
    if valid_var is not None:
        auth_success = str(valid_var).lower() in ("true", "1")

    duration = payload.duration_seconds

    existing = await CallRecord.find_one(CallRecord.call_id == call_id)
    if existing:
        has_better_transcript = len(transcript_entries) > len(existing.transcript or [])
        has_better_data = is_complete and (not existing.transcript or len(existing.transcript) == 0)

        if not is_complete and existing.transcript and len(existing.transcript) > 0:
            logger.info("Skipping incomplete webhook update for {} (existing has {} transcript entries)", call_id, len(existing.transcript))
            return existing

        logger.info("Updating call {} (is_complete={}, new_transcripts={}, existing_transcripts={})",
                     call_id, is_complete, len(transcript_entries), len(existing.transcript or []))

        if has_better_transcript or has_better_data or is_complete:
            if transcript_entries:
                existing.transcript = transcript_entries
            if payload.recording_url:
                existing.recording_url = payload.recording_url
            if duration and duration > 0:
                existing.duration_seconds = duration
            existing.intent = intent
            existing.outcome = outcome
            existing.tags = tags
            existing.transferred = transferred
            existing.auth_success = auth_success
            if variables and len(variables) > 5:
                existing.extracted_data = _clean_extracted_data(variables)
            if provider_npi:
                existing.provider_npi = provider_npi
            if provider_name:
                existing.provider_name = provider_name
            if patient_name:
                existing.patient_name = patient_name
            if patient_dob:
                existing.patient_dob = patient_dob
            if payload.end_at:
                existing.ended_at = _parse_datetime(payload.end_at)
            await existing.save()
        return existing

    record = CallRecord(
        call_id=call_id,
        phone_from=payload.from_number,
        phone_to=payload.to,
        started_at=_parse_datetime(payload.created_at),
        ended_at=_parse_datetime(payload.end_at),
        duration_seconds=duration,
        intent=intent,
        outcome=outcome,
        provider_npi=provider_npi,
        provider_name=provider_name,
        patient_name=patient_name,
        patient_dob=patient_dob,
        transcript=transcript_entries,
        recording_url=payload.recording_url,
        tags=tags,
        flagged=False,
        transferred=transferred,
        auth_success=auth_success,
        extracted_data=_clean_extracted_data(variables) if variables else {},
    )
    await record.insert()
    logger.info("Call record created: {} intent={} outcome={} tags={}", call_id, intent, outcome, tags)
    return record


def _clean_extracted_data(variables: dict) -> dict:
    skip_keys = {
        "now", "now_utc", "short_from", "short_to", "from", "to",
        "call_id", "phone_number", "city", "country", "state", "zip",
        "placement_group", "region", "call_token", "language", "user_id",
        "timestamp", "timezone", "BlandStatusCode",
    }
    return {k: v for k, v in variables.items() if k not in skip_keys and v is not None}
