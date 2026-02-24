from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class BlandTranscriptEntry(BaseModel):
    id: Optional[int] = None
    created_at: Optional[str] = None
    text: str = ""
    user: str = "assistant"

    class Config:
        extra = "allow"


class BlandCallCompletePayload(BaseModel):
    call_id: Optional[str] = None
    c_id: Optional[str] = None
    to: Optional[str] = None
    from_number: Optional[str] = None
    call_length: Optional[float] = None  # in MINUTES
    corrected_duration: Optional[str] = None  # in SECONDS as string
    completed: Optional[bool] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    end_at: Optional[str] = None
    recording_url: Optional[str] = None
    transcripts: Optional[List[BlandTranscriptEntry]] = None
    concatenated_transcript: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    pathway_logs: Optional[List[Dict[str, Any]]] = None
    pathway_tags: Optional[List[str]] = None
    summary: Optional[str] = None
    price: Optional[float] = None
    transferred_to: Optional[str] = None
    call_ended_by: Optional[str] = None
    answered_by: Optional[str] = None
    inbound: Optional[bool] = None
    disposition_tag: Optional[str] = None

    class Config:
        extra = "allow"

    @property
    def effective_call_id(self) -> str:
        return self.call_id or self.c_id or "unknown"

    @property
    def duration_seconds(self) -> int:
        if self.corrected_duration:
            try:
                return int(self.corrected_duration)
            except (ValueError, TypeError):
                pass
        if self.call_length:
            return int(self.call_length * 60)
        return 0
