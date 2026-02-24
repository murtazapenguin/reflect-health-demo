from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.common.error_handlers import register_error_handlers
from app.config import get_settings
from app.database import close_db, init_db
from app.middleware.auth import JWTSessionMiddleware
from app.middleware.cors import configure_cors


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting {} ({})", settings.app_name, settings.app_env)
    await init_db(settings)
    logger.info("Database connected: {}", settings.mongodb_db_name)
    yield
    await close_db()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Reflect Health AI Operations Center",
        description="Voice AI Call Deflection Demo - Admin Dashboard API",
        docs_url="/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(JWTSessionMiddleware)
    configure_cors(app, settings)

    register_error_handlers(app)

    from app.modules.auth.routes import router as auth_router
    from app.modules.dashboard.routes import router as dashboard_router
    from app.modules.health.routes import router as health_router
    from app.modules.voice.routes import router as voice_router
    from app.modules.webhooks.routes import router as webhooks_router

    app.include_router(health_router)
    app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])
    app.include_router(voice_router, prefix=f"{settings.api_v1_prefix}/voice", tags=["voice"])
    app.include_router(webhooks_router, prefix=f"{settings.api_v1_prefix}/webhooks", tags=["webhooks"])
    app.include_router(dashboard_router, prefix=f"{settings.api_v1_prefix}/dashboard", tags=["dashboard"])

    return app


app = create_app()
