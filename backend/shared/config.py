"""
Application configuration loaded from the .env file.
All services import settings from here:
    from shared.config import settings
"""

from functools import lru_cache

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

    ML_SERVICE_URL: str = "http://ml:8001"

    UPLOAD_DIR: str = "./uploads"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
