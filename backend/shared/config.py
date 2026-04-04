"""
Application configuration — loaded from .env file.
All devs import settings from here:
    from shared.config import settings
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ─── Database ───────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://ridershield:password@localhost:5432/ridershield"
    DATABASE_URL_SYNC: str = "postgresql://ridershield:password@localhost:5432/ridershield"

    # ─── Redis ──────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── JWT ────────────────────────────────────────────
    JWT_SECRET_KEY: str = "ridershield-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ─── External APIs ──────────────────────────────────
    OPENWEATHERMAP_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # ─── SMS / OTP (MSG91) ─────────────────────────────
    MSG91_AUTH_KEY: str = ""
    MSG91_OTP_TEMPLATE_ID: str = ""
    MSG91_OTP_LENGTH: int = 6
    MSG91_OTP_EXPIRY_MINUTES: int = 5
    OTP_DEV_BYPASS_CODE: str = "123456"

    # ─── Admin ──────────────────────────────────────────
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "changeme"

    # ─── App ────────────────────────────────────────────
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "RiderShield"
    APP_VERSION: str = "1.0.0"

    # ─── Services ───────────────────────────────────────
    ML_SERVICE_URL: str = "http://ml:8001"

    # ─── File Storage ───────────────────────────────────
    UPLOAD_DIR: str = "./uploads"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
