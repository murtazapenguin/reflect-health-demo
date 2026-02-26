import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.models.call_record import CallRecord
from app.modules.dashboard.schemas import (
    CallDetail,
    CallLogResponse,
    CallSummary,
    KPIMetrics,
    KPITrendPoint,
)


async def get_call_log(
    page: int = 1,
    page_size: int = 20,
    intent: Optional[str] = None,
    outcome: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> CallLogResponse:
    query = {}

    if intent:
        query["intent"] = intent
    if outcome:
        query["outcome"] = outcome
    if tag:
        query["tags"] = tag
    if search:
        query["$or"] = [
            {"provider_name": {"$regex": search, "$options": "i"}},
            {"patient_name": {"$regex": search, "$options": "i"}},
            {"call_id": {"$regex": search, "$options": "i"}},
        ]
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        if date_to:
            date_filter["$lte"] = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        if date_filter:
            query["started_at"] = date_filter

    total = await CallRecord.find(query).count()
    total_pages = max(1, math.ceil(total / page_size))
    skip = (page - 1) * page_size

    records = await CallRecord.find(query).sort("-started_at").skip(skip).limit(page_size).to_list()

    items = [
        CallSummary(
            id=str(r.id),
            call_id=r.call_id,
            started_at=r.started_at.isoformat(),
            duration_seconds=r.duration_seconds,
            intent=r.intent,
            outcome=r.outcome,
            provider_name=r.provider_name,
            patient_name=r.patient_name,
            tags=r.tags,
            flagged=r.flagged,
            transferred=r.transferred,
            transfer_reason=r.transfer_reason,
            source=getattr(r, "source", "bland"),
        )
        for r in records
    ]

    return CallLogResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def get_call_detail(call_id: str) -> Optional[CallDetail]:
    record = await CallRecord.find_one(CallRecord.call_id == call_id)
    if not record:
        return None

    return CallDetail(
        id=str(record.id),
        call_id=record.call_id,
        phone_from=record.phone_from,
        phone_to=record.phone_to,
        started_at=record.started_at.isoformat(),
        ended_at=record.ended_at.isoformat() if record.ended_at else None,
        duration_seconds=record.duration_seconds,
        intent=record.intent,
        outcome=record.outcome,
        provider_npi=record.provider_npi,
        provider_name=record.provider_name,
        patient_name=record.patient_name,
        patient_dob=record.patient_dob,
        transcript=record.transcript,
        recording_url=record.recording_url,
        tags=record.tags,
        flagged=record.flagged,
        transferred=record.transferred,
        transfer_reason=record.transfer_reason,
        source=getattr(record, "source", "bland"),
        auth_success=record.auth_success,
        extracted_data=record.extracted_data,
    )


async def get_kpi_metrics() -> KPIMetrics:
    all_records = await CallRecord.find_all().to_list()
    total = len(all_records)

    if total == 0:
        return KPIMetrics(
            total_calls=0,
            deflection_rate=0.0,
            avg_handle_time_seconds=0.0,
            transfer_rate=0.0,
            auth_success_rate=0.0,
            calls_by_intent={},
            calls_by_outcome={},
        )

    resolved_count = sum(1 for r in all_records if r.outcome == "resolved")
    transferred_count = sum(1 for r in all_records if r.transferred)
    auth_attempts = [r for r in all_records if r.auth_success is not None]
    auth_successes = sum(1 for r in auth_attempts if r.auth_success)

    total_duration = sum(r.duration_seconds for r in all_records)

    by_intent: Dict[str, int] = {}
    by_outcome: Dict[str, int] = {}
    for r in all_records:
        intent_key = r.intent or "unknown"
        by_intent[intent_key] = by_intent.get(intent_key, 0) + 1
        by_outcome[r.outcome] = by_outcome.get(r.outcome, 0) + 1

    return KPIMetrics(
        total_calls=total,
        deflection_rate=round((resolved_count / total) * 100, 1) if total else 0,
        avg_handle_time_seconds=round(total_duration / total, 1) if total else 0,
        transfer_rate=round((transferred_count / total) * 100, 1) if total else 0,
        auth_success_rate=round((auth_successes / len(auth_attempts)) * 100, 1) if auth_attempts else 0,
        calls_by_intent=by_intent,
        calls_by_outcome=by_outcome,
    )


async def get_kpi_trend(days: int = 30) -> List[KPITrendPoint]:
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    records = await CallRecord.find(
        CallRecord.started_at >= start_date
    ).sort("started_at").to_list()

    daily: Dict[str, dict] = {}
    for r in records:
        day_key = r.started_at.strftime("%Y-%m-%d")
        if day_key not in daily:
            daily[day_key] = {"total_calls": 0, "resolved": 0, "transferred": 0}
        daily[day_key]["total_calls"] += 1
        if r.outcome == "resolved":
            daily[day_key]["resolved"] += 1
        if r.transferred:
            daily[day_key]["transferred"] += 1

    trend = []
    current = start_date
    while current <= end_date:
        day_key = current.strftime("%Y-%m-%d")
        data = daily.get(day_key, {"total_calls": 0, "resolved": 0, "transferred": 0})
        trend.append(KPITrendPoint(date=day_key, **data))
        current += timedelta(days=1)

    return trend


async def update_call_tags(call_id: str, tags: List[str]) -> Optional[CallDetail]:
    record = await CallRecord.find_one(CallRecord.call_id == call_id)
    if not record:
        return None
    record.tags = tags
    await record.save()
    return await get_call_detail(call_id)


async def update_call_flag(call_id: str, flagged: bool) -> Optional[CallDetail]:
    record = await CallRecord.find_one(CallRecord.call_id == call_id)
    if not record:
        return None
    record.flagged = flagged
    await record.save()
    return await get_call_detail(call_id)
