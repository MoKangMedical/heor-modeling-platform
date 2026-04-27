from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "HEOR Modeling Platform Backend"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./heor.db"
    auto_create_tables: bool = True
    seed_demo_data: bool = True
    async_jobs_auto_start: bool = True
    job_poll_interval_seconds: float = 1.0
    
    # CORS配置
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://mokangmedical.github.io",
    ]
    
    # 安全配置
    secret_key: str = "heor-platform-secret-key-change-in-production"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    
    # 文件上传
    max_upload_size_mb: int = 50
    upload_dir: str = "./uploads"
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "./logs/heor.log"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
