from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from beanie import Document, Indexed
from pydantic import Field


class CallRecord(Document):
    call_id: Indexed(str, unique=True)
    phone_from: Optional[str] = None
    phone_to: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    intent: Optional[str] = None  # eligibility, claims, other
    outcome: str = "unknown"  # resolved, transferred, failed, abandoned
    provider_npi: Optional[str] = None
    provider_name: Optional[str] = None
    patient_name: Optional[str] = None
    patient_dob: Optional[str] = None
    transcript: List[Dict[str, Any]] = Field(default_factory=list)
    recording_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    flagged: bool = False
    transferred: bool = False
    transfer_reason: Optional[str] = None
    source: str = "bland"  # bland | elevenlabs
    auth_success: Optional[bool] = None
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "call_records"
