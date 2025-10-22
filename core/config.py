import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-this")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    TMP_TOKEN_EXPIRE_MINUTES: int = 10
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    CODE_RATE_LIMIT_SECONDS: int = 60

    load_dotenv()

    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = (os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_HOST") else None
    SMTP_EMAIL: str = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "no-reply@example.com")

settings = Settings()