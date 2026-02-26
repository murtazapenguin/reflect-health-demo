from fastapi import APIRouter
from loguru import logger

from app.models.call_record import CallRecord
from app.models.claim import Claim
from app.models.member import Member
from app.models.prior_auth import PriorAuth
from app.models.provider import Provider
from app.models.user import User

router = APIRouter()


@router.post("/reseed", summary="Re-seed demo data")
async def reseed():
    """Wipe and re-populate all demo data (providers, members, claims,
    prior auths, call records). Real call records from Bland/ElevenLabs
    are preserved — only seed-generated records are replaced."""

    from seed_data import (
        CLAIMS,
        MEMBERS,
        PLAN_BENEFITS,
        PRIOR_AUTHS,
        PROVIDERS,
        _generate_call_records,
    )

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

    for p in PROVIDERS:
        await Provider(**p).insert()

    for m in MEMBERS:
        plan_benefits = PLAN_BENEFITS.get(m["plan_name"], {})
        await Member(**m, benefits=plan_benefits).insert()

    for c in CLAIMS:
        await Claim(**c).insert()

    for pa in PRIOR_AUTHS:
        await PriorAuth(**pa).insert()

    call_records_data = _generate_call_records(50)
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
