from datetime import datetime, timezone
from typing import Any, Dict, Optional

from beanie import Document, Indexed
from pydantic import Field


class QAReview(Document):
    call_id: Indexed(str)
    reviewer: str
    review_score: int = 0
    categories: Dict[str, int] = Field(default_factory=dict)
    notes: str = ""
    status: str = "pending"  # pending, passed, flagged, failed
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "qa_reviews"
