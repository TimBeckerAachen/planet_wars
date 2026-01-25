import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://user:password@localhost/dbname"
    )

    # JWT Configuration
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY", "your-secret-key-here-change-in-production"
    )
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 7

    # Security
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    enable_security_header: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


# Create a global settings instance
settings = Settings()
