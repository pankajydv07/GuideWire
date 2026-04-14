"""
Application configuration loaded from the .env file.
All services import settings from here:
    from shared.config import settings
"""

from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://zylo:password@localhost:5432/zylo"
    DATABASE_URL_SYNC: str = "postgresql://zylo:password@localhost:5432/zylo"

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "zylo-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    OPENWEATHERMAP_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    MSG91_AUTH_KEY: str = ""
    MSG91_OTP_TEMPLATE_ID: str = ""
    MSG91_OTP_LENGTH: int = 6
    MSG91_OTP_EXPIRY_MINUTES: int = 5

    OTP_PROVIDER: str = "dev"
    OTP_LENGTH: int = 6
    OTP_EXPIRY_SECONDS: int = 300
    OTP_DEV_BYPASS_ENABLED: bool = True
    OTP_DEV_BYPASS_CODE: str = "123456"

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "changeme"

    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "Zylo"
    APP_VERSION: str = "1.0.0"
    CORS_ALLOWED_ORIGINS: str = ""

    ML_SERVICE_URL: str = "http://ml:8001"

    UPLOAD_DIR: str = "./uploads"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False

        return False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
