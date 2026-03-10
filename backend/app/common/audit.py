"""Structured HIPAA audit logging for PHI access events."""

from typing import Any, Dict, Optional

from loguru import logger

from app.models.audit_log import AuditLog


async def audit(
    event_type: str,
    actor: str,
    resource: str,
    detail: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Write a structured audit entry. Failures are logged but never raised."""
    try:
        entry = AuditLog(
            event_type=event_type,
            actor=actor,
            resource=resource,
            detail=detail or {},
            ip_address=ip_address,
        )
        await entry.insert()
    except Exception as exc:
        logger.error("Audit log write failed: event={} actor={} err={}", event_type, actor, exc)
