from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

EXEMPT_PATHS = {"/health", "/readiness", "/docs", "/redoc", "/openapi.json", "/scalar"}
EXEMPT_PREFIXES = ("/api/v1/auth/", "/api/v1/webhooks/", "/api/v1/voice/")


class JWTSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.user = None

        path = request.url.path
        if path in EXEMPT_PATHS or any(path.startswith(p) for p in EXEMPT_PREFIXES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                from app.modules.auth.jwt import decode_access_token
                payload = decode_access_token(token)
                request.state.user = payload
            except Exception as e:
                logger.debug("JWT decode failed: {}", e)

        return await call_next(request)
