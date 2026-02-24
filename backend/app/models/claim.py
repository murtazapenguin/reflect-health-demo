from typing import Optional

from beanie import Document, Indexed


class Claim(Document):
    claim_number: Indexed(str, unique=True)
    member_id: str
    provider_npi: str
    date_of_service: str
    procedure_code: Optional[str] = None
    procedure_desc: Optional[str] = None
    status: str  # paid, denied, pending
    billed_amount: float = 0.0
    allowed_amount: float = 0.0
    paid_amount: float = 0.0
    patient_responsibility: float = 0.0
    check_number: Optional[str] = None
    process_date: Optional[str] = None
    received_date: Optional[str] = None
    denial_code: Optional[str] = None
    denial_reason: Optional[str] = None
    appeal_deadline: Optional[str] = None

    class Settings:
        name = "claims"
