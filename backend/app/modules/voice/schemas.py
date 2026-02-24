from typing import Optional

from pydantic import BaseModel


class AuthenticateNPIRequest(BaseModel):
    npi: Optional[str] = None


class AuthenticateNPIResponse(BaseModel):
    valid: bool
    provider_name: Optional[str] = None
    practice_name: Optional[str] = None
    fax_number: Optional[str] = None


class VerifyZipRequest(BaseModel):
    npi: Optional[str] = None
    zip_code: Optional[str] = None


class VerifyZipResponse(BaseModel):
    verified: bool
    provider_name: Optional[str] = None


class EligibilityRequest(BaseModel):
    npi: Optional[str] = None
    patient_name: Optional[str] = None
    patient_dob: Optional[str] = None
    member_id: Optional[str] = None


class EligibilityResponse(BaseModel):
    found: bool
    status: Optional[str] = None
    member_id: Optional[str] = None
    patient_name: Optional[str] = None
    plan_name: Optional[str] = None
    effective_date: Optional[str] = None
    term_date: Optional[str] = None
    copay_primary: Optional[int] = None
    copay_specialist: Optional[int] = None
    deductible: Optional[int] = None
    deductible_met: Optional[int] = None
    cob_status: Optional[str] = None
    out_of_pocket_max: Optional[int] = None
    out_of_pocket_met: Optional[int] = None


class ClaimsRequest(BaseModel):
    npi: Optional[str] = None
    claim_number: Optional[str] = None
    patient_name: Optional[str] = None
    patient_dob: Optional[str] = None
    date_of_service: Optional[str] = None


class ClaimsResponse(BaseModel):
    found: bool
    claim_number: Optional[str] = None
    status: Optional[str] = None
    date_of_service: Optional[str] = None
    procedure_code: Optional[str] = None
    procedure_desc: Optional[str] = None
    billed_amount: Optional[float] = None
    allowed_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    patient_responsibility: Optional[float] = None
    check_number: Optional[str] = None
    process_date: Optional[str] = None
    received_date: Optional[str] = None
    denial_code: Optional[str] = None
    denial_reason: Optional[str] = None
    appeal_deadline: Optional[str] = None
