import secrets
import string

from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, BackgroundTasks, Depends, Header, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from core.config import settings
from core.email_utils import send_email
from core.security import decode_token
from db import engine
from models.models import VerificationCode, User, UserRole

security = HTTPBearer()

def generate_code(length: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def code_rate_limited(session: Session, email: str) -> Optional[int]:
    stmt = select(VerificationCode).where(VerificationCode.email == email).order_by(VerificationCode.created_at.desc()).limit(1)
    last = session.exec(stmt).first()
    if last:
        delta = (datetime.now() - last.created_at).total_seconds()
        if delta < settings.CODE_RATE_LIMIT_SECONDS:
            return int(settings.CODE_RATE_LIMIT_SECONDS - delta)
    return None

def create_and_send_code(background_tasks: BackgroundTasks, session: Session, email: str, subject: str, body_template: str):
    remaining = code_rate_limited(session, email)
    if remaining is not None:
        raise HTTPException(status_code=429, detail=f"Запрос ограничен. Попробуйте через {remaining} секунд")
    code = generate_code()
    expires = datetime.now() + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)
    vc = VerificationCode(email=email, code=code, expires_at=expires)
    session.add(vc)
    session.commit()
    body = body_template.format(code=code, expires=expires.isoformat())
    background_tasks.add_task(send_email, email, subject, body)

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    return session.exec(stmt).first()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Неверные параметры входа")
    email = payload["sub"]
    with Session(engine) as db_session:
        user = get_user_by_email(db_session, email)
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    return current_user