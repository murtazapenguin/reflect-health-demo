from fastapi import APIRouter, Request

from loguru import logger

from app.modules.voice.schemas import (
    AuthenticateNPIResponse,
    ClaimsResponse,
    EligibilityResponse,
    VerifyZipResponse,
)
from app.modules.voice.service import (
    authenticate_npi,
    lookup_claims,
    lookup_eligibility,
    verify_zip,
)

router = APIRouter()


async def _safe_json(request: Request) -> dict:
    import json as _json
    try:
        body = await request.json()
        if isinstance(body, dict):
            return body
        # Bland sometimes double-encodes JSON as a string
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
        # Try raw bytes as double-encoded JSON
        try:
            parsed = _json.loads(raw)
            if isinstance(parsed, str):
                parsed = _json.loads(parsed)
            if isinstance(parsed, dict):
                return parsed
        except (ValueError, TypeError):
            pass
        return {}


@router.post("/authenticate-npi", response_model=AuthenticateNPIResponse, summary="Validate NPI")
async def api_authenticate_npi(request: Request):
    data = await _safe_json(request)
    logger.info("authenticate-npi received: {}", data)
    return await authenticate_npi(data.get("npi"))


@router.post("/verify-zip", response_model=VerifyZipResponse, summary="Verify provider zip code")
async def api_verify_zip(request: Request):
    data = await _safe_json(request)
    logger.info("verify-zip received: {}", data)
    return await verify_zip(data.get("npi"), data.get("zip_code"))


@router.post("/eligibility", response_model=EligibilityResponse, summary="Look up patient eligibility")
async def api_eligibility(request: Request):
    data = await _safe_json(request)
    logger.info("eligibility received: {}", data)
    return await lookup_eligibility(
        npi=data.get("npi"),
        patient_name=data.get("patient_name"),
        patient_dob=data.get("patient_dob"),
        member_id=data.get("member_id"),
        service_type=data.get("service_type"),
    )


@router.post("/claims", response_model=ClaimsResponse, summary="Look up claim status")
async def api_claims(request: Request):
    data = await _safe_json(request)
    logger.info("claims received: {}", data)
    return await lookup_claims(
        npi=data.get("npi"),
        claim_number=data.get("claim_number"),
        patient_name=data.get("patient_name"),
        patient_dob=data.get("patient_dob"),
        date_of_service=data.get("date_of_service"),
    )
