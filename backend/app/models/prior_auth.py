from typing import Optional

from beanie import Document, Indexed


class PriorAuth(Document):
    pa_id: Indexed(str, unique=True)
    member_id: str
    provider_npi: str
    service_description: str
    procedure_code: Optional[str] = None
    status: str  # approved, denied, pending_review, in_review, expired
    urgency: str = "routine"  # routine | urgent
    submitted_date: str
    decision_date: Optional[str] = None
    expiration_date: Optional[str] = None
    approved_units: Optional[str] = None
    denial_reason: Optional[str] = None
    notes: Optional[str] = None

    class Settings:
        name = "prior_auths"
