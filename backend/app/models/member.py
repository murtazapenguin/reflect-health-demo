from typing import Dict, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class ServiceBenefit(BaseModel):
    covered: bool = True
    copay: Optional[int] = None
    coinsurance: Optional[int] = None
    prior_auth_required: bool = False
    visit_limit: Optional[str] = None
    notes: Optional[str] = None


class Member(Document):
    member_id: Indexed(str, unique=True)
    first_name: str
    last_name: str
    dob: str
    plan_name: str
    status: str  # active, inactive, termed
    effective_date: str
    term_date: Optional[str] = None
    copay_primary: int = 0
    copay_specialist: int = 0
    deductible: int = 0
    deductible_met: int = 0
    cob_status: str = "primary"
    out_of_pocket_max: int = 0
    out_of_pocket_met: int = 0
    benefits: Dict[str, ServiceBenefit] = Field(default_factory=dict)

    class Settings:
        name = "members"
