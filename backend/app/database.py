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

    from app.models.call_record import CallRecord
    from app.models.claim import Claim
    from app.models.member import Member
    from app.models.prior_auth import PriorAuth
    from app.models.provider import Provider
    from app.models.user import User

    await init_beanie(
        database=database,
        document_models=[User, Provider, Member, Claim, PriorAuth, CallRecord],
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
