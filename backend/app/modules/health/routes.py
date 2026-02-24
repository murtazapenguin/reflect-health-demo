from fastapi import APIRouter

from app.database import get_database

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health_check():
    return {"status": "healthy"}


@router.get("/readiness", summary="Readiness probe")
async def readiness_check():
    checks = {}
    try:
        db = get_database()
        await db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    return {"status": "ready" if all_ok else "degraded", "checks": checks}
