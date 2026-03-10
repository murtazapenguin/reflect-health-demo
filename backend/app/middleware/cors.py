from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import Settings


# Production frontend URL — always allow so deployed app works even if env is misconfigured
VERCEL_ORIGIN = "https://reflect-health-demo.vercel.app"


def configure_cors(app: FastAPI, settings: Settings) -> None:
    raw = settings.cors_allowed_origins
    if raw and raw.strip() == "*":
        origins = ["*"]
        credentials = False
    elif raw:
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        if VERCEL_ORIGIN not in origins:
            origins.append(VERCEL_ORIGIN)
        credentials = True
    else:
        origins = ["http://localhost:5173", "http://localhost:3000", VERCEL_ORIGIN]
        credentials = True

    logger.info("CORS origins={} credentials={}", origins, credentials)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
