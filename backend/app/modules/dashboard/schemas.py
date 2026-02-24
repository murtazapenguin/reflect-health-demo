from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class CallSummary(BaseModel):
    id: str
    call_id: str
    started_at: str
    duration_seconds: int
    intent: Optional[str] = None
    outcome: str
    provider_name: Optional[str] = None
    patient_name: Optional[str] = None
    tags: List[str] = []
    flagged: bool = False
    transferred: bool = False


class CallDetail(BaseModel):
    id: str
    call_id: str
    phone_from: Optional[str] = None
    phone_to: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int
    intent: Optional[str] = None
    outcome: str
    provider_npi: Optional[str] = None
    provider_name: Optional[str] = None
    patient_name: Optional[str] = None
    patient_dob: Optional[str] = None
    transcript: List[Dict[str, Any]] = []
    recording_url: Optional[str] = None
    tags: List[str] = []
    flagged: bool = False
    transferred: bool = False
    auth_success: Optional[bool] = None
    extracted_data: Dict[str, Any] = {}


class CallLogResponse(BaseModel):
    items: List[CallSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class KPIMetrics(BaseModel):
    total_calls: int
    deflection_rate: float
    avg_handle_time_seconds: float
    transfer_rate: float
    auth_success_rate: float
    calls_by_intent: Dict[str, int]
    calls_by_outcome: Dict[str, int]


class KPITrendPoint(BaseModel):
    date: str
    total_calls: int
    resolved: int
    transferred: int


class TagUpdateRequest(BaseModel):
    tags: List[str]


class FlagUpdateRequest(BaseModel):
    flagged: bool
