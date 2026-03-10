from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

_client: Optional[AsyncIOMotorClient] = None


async def init_db(settings: Settings) -> None:
    global _client
    _client = AsyncIOMotorClient(
        settings.mongodb_url,
        maxPoolSize=50,
        connectTimeoutMS=5000,
        socketTimeoutMS=30000,
        serverSelectionTimeoutMS=5000,
    )
    database = _client[settings.mongodb_db_name]

    from app.models.audit_log import AuditLog
    from app.models.call_record import CallRecord
    from app.models.claim import Claim
    from app.models.member import Member
    from app.models.prior_auth import PriorAuth
    from app.models.provider import Provider
    from app.models.qa_review import QAReview
    from app.models.user import User

    await init_beanie(
        database=database,
        document_models=[User, Provider, Member, Claim, PriorAuth, CallRecord, QAReview, AuditLog],
    )

    await CallRecord.get_motor_collection().create_index(
        "created_at", expireAfterSeconds=settings.data_retention_days * 86400,
    )
    await QAReview.get_motor_collection().create_index(
        "reviewed_at", expireAfterSeconds=settings.data_retention_days * 86400,
    )
    await AuditLog.get_motor_collection().create_index(
        "timestamp", expireAfterSeconds=settings.audit_retention_days * 86400,
    )


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


def get_database():
    if _client is None:
        raise RuntimeError("Database not initialized")
    from app.config import get_settings
    return _client[get_settings().mongodb_db_name]
