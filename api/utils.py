import secrets
import string

from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, BackgroundTasks
from sqlmodel import Session, select
from core.config import settings
from core.email_utils import send_email
from core.security import decode_token
from db import engine
from models.models import VerificationCode, User

def generate_code(length: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def code_rate_limited(session: Session, email: str, purpose: str) -> Optional[int]:
    stmt = select(VerificationCode).where(VerificationCode.email == email, VerificationCode.purpose == purpose).order_by(VerificationCode.created_at.desc()).limit(1)
    last = session.exec(stmt).first()
    if last:
        delta = (datetime.now() - last.created_at).total_seconds()
        if delta < settings.CODE_RATE_LIMIT_SECONDS:
            return int(settings.CODE_RATE_LIMIT_SECONDS - delta)
    return None

def create_and_send_code(background_tasks: BackgroundTasks, session: Session, email: str, purpose: str, subject: str, body_template: str):
    remaining = code_rate_limited(session, email, purpose)
    if remaining is not None:
        raise HTTPException(status_code=429, detail=f"Запрос ограничен. Попробуйте через {remaining} секунд")
    code = generate_code()
    expires = datetime.now() + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)
    vc = VerificationCode(email=email, purpose=purpose, code=code, expires_at=expires)
    session.add(vc)
    session.commit()
    body = body_template.format(code=code, expires=expires.isoformat())
    background_tasks.add_task(send_email, email, subject, body)

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    return session.exec(stmt).first()

def get_current_user(token: str) -> User:
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Неверные параметры входа")
    email = payload["sub"]
    with Session(engine) as session:
        user = get_user_by_email(session, email)
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        return user