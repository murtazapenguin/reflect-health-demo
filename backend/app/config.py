import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = ".env" if os.path.isfile(".env") else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "reflect-health-demo"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    secret_key: str = "reflect-health-demo-secret-key-2026"
    api_v1_prefix: str = "/api/v1"

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "reflect_health"

    jwt_secret_key: str = "reflect-health-jwt-secret-2026"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480
    jwt_issuer: str = "reflect-health-demo"
    jwt_audience: str = "reflect-health-demo"

    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    bland_webhook_secret: str = ""

    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
