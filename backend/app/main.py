from fastapi import FastAPI

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.db.init_db import init_db


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
def on_startup() -> None:
    if settings.auto_create_tables:
        init_db()


app.include_router(health_router)
app.include_router(api_router, prefix=settings.api_v1_prefix)
