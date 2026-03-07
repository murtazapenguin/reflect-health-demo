from typing import List, Optional

from fastapi import APIRouter, Query

from app.common.exceptions import NotFoundException
from app.modules.dashboard.schemas import (
    AccuracyKPIResponse,
    CallDetail,
    CallLogResponse,
    FlagUpdateRequest,
    KPIMetrics,
    KPITrendPoint,
    QAReviewRequest,
    QAReviewResponse,
    TagUpdateRequest,
)
from app.modules.dashboard.service import (
    create_qa_review,
    get_accuracy_kpis,
    get_call_detail,
    get_call_log,
    get_kpi_metrics,
    get_kpi_trend,
    get_reviews_for_call,
    update_call_flag,
    update_call_tags,
)

router = APIRouter()


@router.get("/calls", response_model=CallLogResponse, summary="Get paginated call log")
async def api_get_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    intent: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return await get_call_log(
        page=page,
        page_size=page_size,
        intent=intent,
        outcome=outcome,
        tag=tag,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/calls/{call_id}", response_model=CallDetail, summary="Get call detail")
async def api_get_call_detail(call_id: str):
    detail = await get_call_detail(call_id)
    if not detail:
        raise NotFoundException(f"Call {call_id} not found")
    return detail


@router.get("/kpis", response_model=KPIMetrics, summary="Get aggregated KPIs")
async def api_get_kpis():
    return await get_kpi_metrics()


@router.get("/kpis/trend", response_model=List[KPITrendPoint], summary="Get KPI trend")
async def api_get_kpi_trend(days: int = Query(30, ge=1, le=90)):
    return await get_kpi_trend(days=days)


@router.patch("/calls/{call_id}/tags", response_model=CallDetail, summary="Update call tags")
async def api_update_tags(call_id: str, body: TagUpdateRequest):
    detail = await update_call_tags(call_id, body.tags)
    if not detail:
        raise NotFoundException(f"Call {call_id} not found")
    return detail


@router.patch("/calls/{call_id}/flag", response_model=CallDetail, summary="Flag/unflag a call")
async def api_update_flag(call_id: str, body: FlagUpdateRequest):
    detail = await update_call_flag(call_id, body.flagged)
    if not detail:
        raise NotFoundException(f"Call {call_id} not found")
    return detail


@router.post("/calls/{call_id}/review", response_model=QAReviewResponse, summary="Submit QA review")
async def api_submit_review(call_id: str, body: QAReviewRequest):
    detail = await get_call_detail(call_id)
    if not detail:
        raise NotFoundException(f"Call {call_id} not found")
    return await create_qa_review(
        call_id=call_id,
        reviewer=body.reviewer,
        review_score=body.review_score,
        categories=body.categories,
        notes=body.notes,
        status=body.status,
    )


@router.get("/calls/{call_id}/reviews", response_model=List[QAReviewResponse], summary="Get reviews for a call")
async def api_get_reviews(call_id: str):
    return await get_reviews_for_call(call_id)


@router.get("/kpis/accuracy", response_model=AccuracyKPIResponse, summary="Get accuracy KPIs")
async def api_get_accuracy_kpis():
    return await get_accuracy_kpis()
