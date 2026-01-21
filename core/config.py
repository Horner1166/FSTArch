from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://oqsqwyckhuzieqrndvao:gffdlecgpbdovpddezilfkvrreszkl@9qasp5v56q8ckkf5dc.leapcellpool.com:6438/gfyzzuvotgqnlmyprbax?sslmode=require"
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

    S3_ENDPOINT_URL: str = "https://objstorage.leapcell.io"
    S3_ACCESS_KEY_ID: str = "87c3bad6303643cd85133c3ac5ff4ed0"
    S3_SECRET_ACCESS_KEY: str = "8aab2ff0c4d7974f4d55a8043f79bdb65bed5b0c823133eb8f4bf42a60be005a"
    S3_BUCKET_NAME: str = "dnstrg-wrhq-pix5-r5hremw2"
    S3_PUBLIC_URL: str = f"https://3mwvmd.leapcellobj.com/{S3_BUCKET_NAME}"
    S3_REGION: str = "us-east-1"

settings = Settings()