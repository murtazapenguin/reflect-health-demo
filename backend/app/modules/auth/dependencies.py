from typing import Annotated

from fastapi import Depends, Request

from app.common.exceptions import UnauthorizedException


async def get_current_user_payload(request: Request) -> dict:
    payload = request.state.user
    if payload is None:
        raise UnauthorizedException("Authentication required")
    return payload


CurrentUserPayload = Annotated[dict, Depends(get_current_user_payload)]
