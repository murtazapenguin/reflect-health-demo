from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings


def configure_cors(app: FastAPI, settings: Settings) -> None:
    if settings.cors_allowed_origins:
        origins = [o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()]
    else:
        origins = ["http://localhost:5173", "http://localhost:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
