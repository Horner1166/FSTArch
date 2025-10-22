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

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: str = "romka11666@gmail.com"
    SMTP_PASSWORD: str = "rlkn jksa dmuv pako"
    FROM_EMAIL: str = "romka11666@gmail.com"

settings = Settings()