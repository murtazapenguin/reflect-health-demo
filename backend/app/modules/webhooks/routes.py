import hashlib
import hmac
from typing import Optional

from fastapi import APIRouter, Header, Request
from loguru import logger

from app.config import get_settings
from app.modules.webhooks.schemas import BlandCallCompletePayload
from app.modules.webhooks.service import ingest_bland_call

router = APIRouter()


@router.post("/bland/call-complete", summary="Bland AI post-call webhook")
async def bland_call_complete(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None),
):
    body_bytes = await request.body()
    settings = get_settings()

    if settings.bland_webhook_secret and x_webhook_signature:
        expected = hmac.new(
            settings.bland_webhook_secret.encode(),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_webhook_signature):
            logger.warning("Bland webhook signature mismatch")

    import json
    data = json.loads(body_bytes)

    logger.info("Bland webhook raw keys: {}", list(data.keys()))
    logger.info("Bland webhook call_id={} status={} completed={}", data.get("call_id"), data.get("status"), data.get("completed"))
    logger.info("Bland webhook call_length={} transcripts_count={}", data.get("call_length"), len(data.get("transcripts", []) or []))
    logger.info("Bland webhook variables={}", data.get("variables"))
    logger.info("Bland webhook concatenated_transcript length={}", len(data.get("concatenated_transcript", "") or ""))
    if data.get("transcripts"):
        logger.info("Bland webhook first transcript entry: {}", data["transcripts"][0] if data["transcripts"] else "empty")

    payload = BlandCallCompletePayload(**data)

    record = await ingest_bland_call(payload)
    return {"status": "ok", "call_id": record.call_id}
