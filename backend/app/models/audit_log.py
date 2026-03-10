from datetime import datetime, timezone
from typing import Any, Dict, Optional

from beanie import Document, Indexed
from pydantic import Field


class AuditLog(Document):
    event_type: Indexed(str)  # phi_access, verification_attempt, data_lookup, transfer
    actor: str  # e.g. "provider:1003045220", "member:MBR-001234", "system"
    resource: str  # e.g. "member:MBR-001234", "claim:CLM-00481922"
    detail: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "audit_logs"
