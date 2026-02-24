from fastapi import APIRouter

from app.config import get_settings
from app.database import get_database

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health_check():
    return {"status": "healthy"}


@router.get("/debug/cors", summary="Show CORS config")
async def debug_cors():
    s = get_settings()
    raw = s.cors_allowed_origins
    origins = [o.strip() for o in raw.split(",") if o.strip()] if raw else []
    return {"raw": raw, "parsed_origins": origins}


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
