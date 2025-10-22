from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from datetime import datetime

from api.utils import get_user_by_email, create_and_send_code
from core.security import create_access_token
from db import engine
from models.models import VerificationCode, User
from schemas.auth import RequestCodeSchema, ConfirmCodeSchema, LoginCodeVerifySchema

router = APIRouter()

@router.post("/auth/request-code", status_code=200)
def request_code(data: RequestCodeSchema, background_tasks: BackgroundTasks):
    with Session(engine) as session:
        user = get_user_by_email(session, data.email)
        if user:
            purpose = "login_code"
            subject = "Код для входа"
            body = "Ваш код для входа: {code}."
        else:
            purpose = "registration"
            subject = "Код для регистрации"
            body = "Ваш код для регистрации: {code}."

        create_and_send_code(background_tasks,session,data.email,purpose,subject,body)
    return {"msg": f"Код для {'входа' if user else 'регистрации'} отправлен на email"}

@router.post("/auth/register")
def register_confirm(data: ConfirmCodeSchema):
    with Session(engine) as session:
        stmt = select(VerificationCode).where(VerificationCode.email == data.email, VerificationCode.purpose == "registration").order_by(VerificationCode.created_at.desc()).limit(1)
        vc = session.exec(stmt).first()
        if not vc or vc.expires_at < datetime.now():
            raise HTTPException(status_code=400, detail="Код устарел")
        if vc.code != data.code:
            raise HTTPException(status_code=400, detail="Неверный код")
        user = get_user_by_email(session, data.email)
        if not user:
            user = User(email=data.email)
            session.add(user)
            session.commit()
            session.refresh(user)
        return {"Теперь войдите"}

@router.post("/auth/login")
def verify_login_code(data: LoginCodeVerifySchema):
    with Session(engine) as session:
        stmt = select(VerificationCode).where(VerificationCode.email == data.email, VerificationCode.purpose == "login_code").order_by(VerificationCode.created_at.desc()).limit(1)
        lc = session.exec(stmt).first()
        if not lc or lc.expires_at < datetime.now():
            raise HTTPException(status_code=400, detail="Код устарел")
        if lc.code != data.code:
            raise HTTPException(status_code=400, detail="Неверный код")
        user = get_user_by_email(session, data.email)
        if not user:
            raise HTTPException(status_code=400, detail="Пользователя не существует")
        access_token = create_access_token({"sub": user.email})
        return {"access_token": access_token}

