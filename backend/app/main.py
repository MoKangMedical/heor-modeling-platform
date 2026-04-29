import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.db.init_db import init_db


# 配置日志
settings = get_settings()
log_dir = Path(settings.log_file).parent
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="卫生经济学与结果研究建模平台 API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（用于生产模式）
site_dir = Path(__file__).parent.parent.parent / "site"
if site_dir.exists():
    app.mount("/static", StaticFiles(directory=str(site_dir)), name="static")


@app.on_event("startup")
def on_startup() -> None:
    logger.info(f"Starting {settings.app_name} in {settings.app_env} mode")
    
    # 创建上传目录
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # 初始化数据库
    if settings.auto_create_tables:
        logger.info("Initializing database...")
        init_db()
    
    # 加载演示数据
    if settings.seed_demo_data:
        logger.info("Loading demo data...")
        _load_demo_data()
    
    logger.info("Application started successfully")


@app.on_event("shutdown")
def on_shutdown() -> None:
    logger.info("Application shutting down")


def _load_demo_data():
    """加载演示数据"""
    try:
        from app.services.demo_service import DemoService
        demo_service = DemoService()
        demo_service.load_demo_data()
        logger.info("Demo data loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load demo data: {e}")


# 注册路由
app.include_router(health_router)
app.include_router(api_router, prefix=settings.api_v1_prefix)


# 根路由
@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "api": settings.api_v1_prefix,
    }


# 健康检查
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "mode": settings.app_env,
        "database": "connected",
    }
