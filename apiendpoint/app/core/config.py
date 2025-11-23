"""
Configuration settings for the ERP Query Service
"""
import os
from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    API_PORT: int = 2025
    COMMAND_PORT: int = 3108
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database Configuration
    DATABASE_URL: str = "mysql+pymysql://root:@localhost/wms_manufacture"

    # Database Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    # JWT Configuration
    JWT_SECRET: str = "your-secret-key-here"
    JWT_EXPIRY: str = "24h"
    ALGORITHM: str = "HS256"

    # CORS Configuration
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:2025"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
