"""Request timing middleware — logs slow requests and sets X-Response-Time header."""

import time

from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

SLOW_THRESHOLD_MS = 500


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        if duration_ms > SLOW_THRESHOLD_MS:
            logger.warning(
                "Slow request: {} {} — {}ms (status {})",
                request.method, request.url.path, duration_ms, response.status_code,
            )

        return response
