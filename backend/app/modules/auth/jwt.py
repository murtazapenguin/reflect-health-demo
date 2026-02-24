import uuid
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import PyJWTError

from app.common.exceptions import UnauthorizedException
from app.config import get_settings


from typing import Optional


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))

    to_encode.update({
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
        "type": "access",
    })
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        return payload
    except PyJWTError as e:
        raise UnauthorizedException(f"Invalid token: {e}")
