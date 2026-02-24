import re
from typing import Optional

from loguru import logger

from app.models.claim import Claim
from app.models.member import Member
from app.models.provider import Provider
from app.modules.voice.schemas import (
    AuthenticateNPIResponse,
    ClaimsResponse,
    EligibilityResponse,
    VerifyZipResponse,
)

WORD_TO_DIGIT = {
    "zero": "0", "oh": "0", "o": "0",
    "one": "1", "won": "1",
    "two": "2", "to": "2", "too": "2",
    "three": "3", "tree": "3",
    "four": "4", "for": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9", "niner": "9",
}


def _normalize_digits(raw: str) -> str:
    raw = raw.strip().lower()
    if re.match(r"^\d+$", raw.replace("-", "").replace(" ", "")):
        return raw.replace("-", "").replace(" ", "")
    words = re.split(r"[\s,\-]+", raw)
    digits = []
    for w in words:
        w = w.strip().rstrip(".")
        if w.isdigit():
            digits.append(w)
        elif w in WORD_TO_DIGIT:
            digits.append(WORD_TO_DIGIT[w])
    return "".join(digits)


STT_CLAIM_PREFIX_FIXES = {
    "CLN": "CLM", "CL M": "CLM", "C LM": "CLM", "CLAM": "CLM",
    "CIM": "CLM", "CLW": "CLM", "CRM": "CLM", "KLM": "CLM",
    "CLAIM": "CLM", "CLIM": "CLM", "CLEM": "CLM", "CLN-": "CLM-",
}


def _normalize_claim_number(raw: str) -> str:
    """Normalize claim numbers from various spoken/STT formats."""
    cleaned = raw.strip().upper().replace(" ", "")
    logger.info("Claim normalize: raw='{}' cleaned='{}'", raw, cleaned)

    for wrong, right in STT_CLAIM_PREFIX_FIXES.items():
        if cleaned.startswith(wrong):
            cleaned = right + cleaned[len(wrong):]
            break

    if re.match(r"^CLM-?\d+$", cleaned):
        if "-" not in cleaned:
            cleaned = cleaned[:3] + "-" + cleaned[3:]
        return cleaned

    digits = re.sub(r"[^0-9]", "", cleaned)
    if digits:
        return f"CLM-{digits.zfill(8)}"
    return cleaned


async def authenticate_npi(npi: Optional[str] = None) -> AuthenticateNPIResponse:
    if not npi:
        logger.info("NPI is null/empty")
        return AuthenticateNPIResponse(valid=False)
    npi_clean = _normalize_digits(npi)
    logger.info("NPI raw='{}' normalized='{}'", npi, npi_clean)
    if not npi_clean:
        return AuthenticateNPIResponse(valid=False)
    provider = await Provider.find_one(Provider.npi == npi_clean)
    if provider is None:
        logger.info("NPI lookup failed: {}", npi_clean)
        return AuthenticateNPIResponse(valid=False)

    return AuthenticateNPIResponse(
        valid=True,
        provider_name=provider.name,
        practice_name=provider.practice_name,
        fax_number=provider.fax_number,
    )


async def verify_zip(npi: Optional[str] = None, zip_code: Optional[str] = None) -> VerifyZipResponse:
    if not npi or not zip_code:
        logger.info("Zip verify missing data: npi='{}' zip='{}'", npi, zip_code)
        return VerifyZipResponse(verified=False)
    npi_clean = _normalize_digits(npi)
    zip_clean = _normalize_digits(zip_code)[:5]
    logger.info("Zip verify raw npi='{}' zip='{}' normalized npi='{}' zip='{}'", npi, zip_code, npi_clean, zip_clean)
    if not npi_clean or not zip_clean:
        return VerifyZipResponse(verified=False)
    provider = await Provider.find_one(Provider.npi == npi_clean)
    if provider is None:
        return VerifyZipResponse(verified=False)

    if provider.zip_code == zip_clean:
        return VerifyZipResponse(verified=True, provider_name=provider.name)

    return VerifyZipResponse(verified=False)


async def lookup_eligibility(
    npi: Optional[str] = None,
    patient_name: Optional[str] = None,
    patient_dob: Optional[str] = None,
    member_id: Optional[str] = None,
) -> EligibilityResponse:
    if not patient_name and not member_id:
        logger.info("Eligibility lookup missing patient_name and member_id")
        return EligibilityResponse(found=False)
    if member_id:
        member = await Member.find_one(Member.member_id == member_id.strip().upper())
        if member:
            return _member_to_eligibility(member)

    name_parts = patient_name.strip().lower().split()
    if len(name_parts) < 2:
        return EligibilityResponse(found=False)

    first_name = name_parts[0]
    last_name = name_parts[-1]

    query = {
        "first_name": {"$regex": f"^{first_name}$", "$options": "i"},
        "last_name": {"$regex": f"^{last_name}$", "$options": "i"},
    }
    if patient_dob:
        dob_clean = patient_dob.strip()
        query["dob"] = dob_clean

    members = await Member.find(query).to_list()

    if len(members) == 0:
        logger.info("Eligibility lookup failed: {} / {}", patient_name, patient_dob)
        return EligibilityResponse(found=False)

    if len(members) == 1:
        return _member_to_eligibility(members[0])

    # Multiple matches -- return first but log
    logger.warning("Multiple member matches for {} / {}: {}", patient_name, patient_dob, len(members))
    return _member_to_eligibility(members[0])


def _member_to_eligibility(member: Member) -> EligibilityResponse:
    return EligibilityResponse(
        found=True,
        status=member.status,
        member_id=member.member_id,
        patient_name=f"{member.first_name} {member.last_name}",
        plan_name=member.plan_name,
        effective_date=member.effective_date,
        term_date=member.term_date,
        copay_primary=member.copay_primary,
        copay_specialist=member.copay_specialist,
        deductible=member.deductible,
        deductible_met=member.deductible_met,
        cob_status=member.cob_status,
        out_of_pocket_max=member.out_of_pocket_max,
        out_of_pocket_met=member.out_of_pocket_met,
    )


async def lookup_claims(
    npi: str,
    claim_number: Optional[str] = None,
    patient_name: Optional[str] = None,
    patient_dob: Optional[str] = None,
    date_of_service: Optional[str] = None,
) -> ClaimsResponse:
    if claim_number:
        claim_clean = _normalize_claim_number(claim_number)
        logger.info("Claim lookup raw='{}' normalized='{}'", claim_number, claim_clean)
        claim = await Claim.find_one(Claim.claim_number == claim_clean)
        if claim:
            return _claim_to_response(claim)
        digits_only = re.sub(r"[^0-9]", "", claim_clean)
        if digits_only:
            claim = await Claim.find_one(
                {"claim_number": {"$regex": digits_only, "$options": "i"}}
            )
            if claim:
                return _claim_to_response(claim)

    if patient_name:
        name_parts = patient_name.strip().lower().split()
        logger.info("Claims patient lookup: name_parts={} dob={}", name_parts, patient_dob)
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = name_parts[-1]
            member_query = {
                "first_name": {"$regex": f"^{first_name}$", "$options": "i"},
                "last_name": {"$regex": f"^{last_name}$", "$options": "i"},
            }
            if patient_dob:
                member_query["dob"] = patient_dob.strip()

            members = await Member.find(member_query).to_list()
            logger.info("Claims member search found {} members: {}", len(members), [m.member_id for m in members])
            if members:
                member_ids = [m.member_id for m in members]
                claim_query = {"member_id": {"$in": member_ids}}
                if date_of_service:
                    claim_query["date_of_service"] = date_of_service.strip()

                claims = await Claim.find(claim_query).sort("-date_of_service").to_list()
                if claims:
                    return _claim_to_response(claims[0])

    logger.info("Claims lookup failed: claim={} name={} dos={}", claim_number, patient_name, date_of_service)
    return ClaimsResponse(found=False)


def _claim_to_response(claim: Claim) -> ClaimsResponse:
    return ClaimsResponse(
        found=True,
        claim_number=claim.claim_number,
        status=claim.status,
        date_of_service=claim.date_of_service,
        procedure_code=claim.procedure_code,
        procedure_desc=claim.procedure_desc,
        billed_amount=claim.billed_amount,
        allowed_amount=claim.allowed_amount,
        paid_amount=claim.paid_amount,
        patient_responsibility=claim.patient_responsibility,
        check_number=claim.check_number,
        process_date=claim.process_date,
        received_date=claim.received_date,
        denial_code=claim.denial_code,
        denial_reason=claim.denial_reason,
        appeal_deadline=claim.appeal_deadline,
    )
