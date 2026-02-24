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
    try:
        body = await request.json()
        if isinstance(body, dict):
            return body
        logger.warning("Voice API received non-dict body: {}", type(body))
        return {}
    except Exception as e:
        raw = await request.body()
        logger.warning("Voice API JSON parse failed: {} body={}", e, raw[:500])
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
