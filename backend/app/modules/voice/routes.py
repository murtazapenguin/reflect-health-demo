from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel

from app.models.claim import Claim
from app.models.member import Member
from app.models.prior_auth import PriorAuth
from app.modules.voice.events import emit_event, end_session, start_session, subscribe
from app.modules.voice.schemas import (
    AuthenticateNPIResponse,
    ClaimsResponse,
    EligibilityResponse,
    VerifyMemberResponse,
    VerifyZipResponse,
)
from app.modules.voice.service import (
    authenticate_npi,
    lookup_claims,
    lookup_eligibility,
    verify_member,
    verify_zip,
)

router = APIRouter()


async def _safe_json(request: Request) -> dict:
    import json as _json
    try:
        body = await request.json()
        if isinstance(body, dict):
            return body
        if isinstance(body, str):
            logger.info("Voice API received string body, attempting double-parse: {}", body[:300])
            try:
                parsed = _json.loads(body)
                if isinstance(parsed, dict):
                    return parsed
            except (ValueError, TypeError):
                pass
        logger.warning("Voice API received non-dict body: {} value={}", type(body), str(body)[:300])
        return {}
    except Exception as e:
        raw = await request.body()
        logger.warning("Voice API JSON parse failed: {} body={}", e, raw[:500])
        try:
            parsed = _json.loads(raw)
            if isinstance(parsed, str):
                parsed = _json.loads(parsed)
            if isinstance(parsed, dict):
                return parsed
        except (ValueError, TypeError):
            pass
        return {}


# ── Session management ──────────────────────────────────────────────

class SessionStartRequest(BaseModel):
    conversation_id: str


@router.post("/session/start", summary="Register an active orchestration session")
async def api_session_start(body: SessionStartRequest):
    start_session(body.conversation_id)
    return {"status": "ok", "conversation_id": body.conversation_id}


@router.post("/session/end", summary="End an orchestration session")
async def api_session_end(body: SessionStartRequest):
    end_session(body.conversation_id)
    return {"status": "ok"}


@router.get("/events/stream", summary="SSE stream for orchestration events")
async def api_events_stream(conversation_id: str):
    return StreamingResponse(
        subscribe(conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Tool endpoints ──────────────────────────────────────────────────

@router.post("/authenticate-npi", response_model=AuthenticateNPIResponse, summary="Validate NPI")
async def api_authenticate_npi(request: Request):
    data = await _safe_json(request)
    logger.info("authenticate-npi received: {}", data)
    result = await authenticate_npi(data.get("npi"))
    emit_event("npi_verified", {
        "npi": data.get("npi"),
        "valid": result.valid,
        "provider_name": result.provider_name,
        "practice_name": result.practice_name,
    })
    return result


@router.post("/verify-zip", response_model=VerifyZipResponse, summary="Verify provider zip code")
async def api_verify_zip(request: Request):
    data = await _safe_json(request)
    logger.info("verify-zip received: {}", data)
    result = await verify_zip(data.get("npi"), data.get("zip_code"))
    emit_event("zip_verified", {
        "npi": data.get("npi"),
        "zip_code": data.get("zip_code"),
        "verified": result.verified,
        "provider_name": result.provider_name,
    })
    return result


@router.post("/verify-member", response_model=VerifyMemberResponse, summary="Verify member identity")
async def api_verify_member(request: Request):
    data = await _safe_json(request)
    logger.info("verify-member received: {}", data)
    result = await verify_member(
        caller_type=data.get("caller_type"),
        patient_name=data.get("patient_name"),
        patient_dob=data.get("patient_dob"),
        member_id=data.get("member_id"),
        ssn_last4=data.get("ssn_last4"),
        address_zip=data.get("address_zip"),
    )
    emit_event("member_verified", {
        "verified": result.verified,
        "member_id": result.member_id,
        "patient_name": result.patient_name,
        "plan_name": result.plan_name,
        "status": result.status,
        "caller_type": data.get("caller_type"),
        "message": result.message,
    })
    return result


@router.post("/eligibility", response_model=EligibilityResponse, summary="Look up patient eligibility")
async def api_eligibility(request: Request):
    data = await _safe_json(request)
    logger.info("eligibility received: {}", data)
    result = await lookup_eligibility(
        npi=data.get("npi"),
        patient_name=data.get("patient_name"),
        patient_dob=data.get("patient_dob"),
        member_id=data.get("member_id"),
        service_type=data.get("service_type"),
    )
    emit_event("eligibility_retrieved", result.model_dump())
    return result


@router.post("/claims", response_model=ClaimsResponse, summary="Look up claim status")
async def api_claims(request: Request):
    data = await _safe_json(request)
    logger.info("claims received: {}", data)
    result = await lookup_claims(
        npi=data.get("npi"),
        claim_number=data.get("claim_number"),
        patient_name=data.get("patient_name"),
        patient_dob=data.get("patient_dob"),
        member_id=data.get("member_id"),
        date_of_service=data.get("date_of_service"),
        billed_amount=data.get("billed_amount"),
    )
    emit_event("claim_retrieved", result.model_dump())
    return result


# ── Caller context ──────────────────────────────────────────────────

@router.get("/caller-context/{member_id}", summary="Get full caller context for a verified member")
async def api_caller_context(member_id: str):
    mid = member_id.strip().upper()
    member = await Member.find_one(Member.member_id == mid)
    if not member:
        return {"found": False, "message": f"No member found with ID {mid}"}

    claims = await Claim.find(
        Claim.member_id == mid
    ).sort("-date_of_service").limit(10).to_list()

    prior_auths = await PriorAuth.find(
        PriorAuth.member_id == mid
    ).sort("-submitted_date").limit(5).to_list()

    return {
        "found": True,
        "member": {
            "member_id": member.member_id,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "dob": member.dob,
            "plan_name": member.plan_name,
            "status": member.status,
            "effective_date": member.effective_date,
            "term_date": member.term_date,
            "copay_primary": member.copay_primary,
            "copay_specialist": member.copay_specialist,
            "deductible": member.deductible,
            "deductible_met": member.deductible_met,
            "out_of_pocket_max": member.out_of_pocket_max,
            "out_of_pocket_met": member.out_of_pocket_met,
        },
        "claims": [
            {
                "claim_number": c.claim_number,
                "status": c.status,
                "date_of_service": c.date_of_service,
                "procedure_desc": c.procedure_desc,
                "billed_amount": c.billed_amount,
                "paid_amount": c.paid_amount,
                "denial_reason": c.denial_reason,
            }
            for c in claims
        ],
        "prior_auths": [
            {
                "pa_id": pa.pa_id,
                "status": pa.status,
                "service_description": pa.service_description,
                "submitted_date": pa.submitted_date,
                "decision_date": pa.decision_date,
            }
            for pa in prior_auths
        ],
    }
