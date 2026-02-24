from fastapi import APIRouter

from app.config import get_settings
from app.database import get_database

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health_check():
    return {"status": "healthy"}


@router.get("/debug/cors", summary="Show CORS config")
async def debug_cors():
    import os
    s = get_settings()
    raw_setting = s.cors_allowed_origins
    raw_env = os.environ.get("CORS_ALLOWED_ORIGINS", "<NOT SET>")
    env_keys = [k for k in os.environ.keys() if "CORS" in k.upper() or "ORIGIN" in k.upper()]
    return {
        "pydantic_value": raw_setting,
        "env_var": raw_env,
        "matching_env_keys": env_keys,
    }


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
