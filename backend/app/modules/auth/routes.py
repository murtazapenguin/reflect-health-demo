from fastapi import APIRouter, Request

from app.common.exceptions import UnauthorizedException
from app.models.user import User
from app.modules.auth.jwt import create_access_token
from app.modules.auth.schemas import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Login with username and password")
async def login(body: LoginRequest):
    user = await User.find_one(User.email == body.username)
    if user is None:
        raise UnauthorizedException("Invalid credentials")

    if not user.verify_password(body.password):
        raise UnauthorizedException("Invalid credentials")

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "roles": user.roles,
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        expires_in=480 * 60,
        user={
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "roles": user.roles,
        },
    )


@router.get("/me", summary="Get current user profile")
async def get_current_user(request: Request):
    payload = request.state.user
    if payload is None:
        raise UnauthorizedException("Authentication required")
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "display_name": payload.get("display_name"),
        "roles": payload.get("roles", []),
    }
