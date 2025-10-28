import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    TMP_TOKEN_EXPIRE_MINUTES: int = 10
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    CODE_RATE_LIMIT_SECONDS: int = 60

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: str = "doorkaauthorize@gmail.com"
    SMTP_PASSWORD: str = "htnr gqvv mfec yusb"
    FROM_EMAIL: str = "authorize@gmail.com"

settings = Settings()