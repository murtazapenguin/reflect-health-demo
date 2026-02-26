import importlib
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.call_record import CallRecord
from app.models.claim import Claim
from app.models.member import Member
from app.models.prior_auth import PriorAuth
from app.models.provider import Provider
from app.models.user import User

router = APIRouter()


def _import_seed_data():
    """Import seed_data.py from the project root regardless of working directory."""
    # seed_data.py lives at backend/seed_data.py — two levels up from this file
    candidates = [
        Path(__file__).resolve().parents[3] / "seed_data.py",  # backend/app/modules/admin -> backend
        Path.cwd() / "seed_data.py",
    ]
    for p in candidates:
        if p.exists():
            spec = importlib.util.spec_from_file_location("seed_data", str(p))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    raise ImportError(f"seed_data.py not found in {[str(c) for c in candidates]}")


@router.post("/reseed", summary="Re-seed demo data")
async def reseed():
    """Wipe and re-populate all demo data (providers, members, claims,
    prior auths, call records)."""
    try:
        sd = _import_seed_data()
    except ImportError as e:
        logger.error("Cannot import seed_data: {}", e)
        raise HTTPException(status_code=500, detail=str(e))

    logger.info("Re-seeding demo data...")

    await User.delete_all()
    await Provider.delete_all()
    await Member.delete_all()
    await Claim.delete_all()
    await PriorAuth.delete_all()
    await CallRecord.delete_all()

    admin = User(
        email="admin@reflecthealth.com",
        display_name="Chris Griffith",
        hashed_password=User.hash_password("demo2026"),
        roles=["admin"],
    )
    await admin.insert()

    for p in sd.PROVIDERS:
        await Provider(**p).insert()

    for m in sd.MEMBERS:
        plan_benefits = sd.PLAN_BENEFITS.get(m["plan_name"], {})
        await Member(**m, benefits=plan_benefits).insert()

    for c in sd.CLAIMS:
        await Claim(**c).insert()

    for pa in sd.PRIOR_AUTHS:
        await PriorAuth(**pa).insert()

    call_records_data = sd._generate_call_records(50)
    for cr in call_records_data:
        await CallRecord(**cr).insert()

    counts = {
        "users": await User.count(),
        "providers": await Provider.count(),
        "members": await Member.count(),
        "claims": await Claim.count(),
        "prior_auths": await PriorAuth.count(),
        "call_records": await CallRecord.count(),
    }
    logger.info("Re-seed complete: {}", counts)
    return {"status": "ok", "counts": counts}
