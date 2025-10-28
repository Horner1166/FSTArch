from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from api.utils import get_user_by_email, create_and_send_code, generate_code
from core.security import create_access_token
from models.models import VerificationCode, User
from schemas.auth import RequestCodeSchema, ConfirmCodeSchema, LoginCodeVerifySchema
from db import session

router = APIRouter()

@router.post("/request-code", status_code=200)
def request_code(data: RequestCodeSchema, background_tasks: BackgroundTasks):
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

@router.post("/authorize")
def verify_login_code(data: LoginCodeVerifySchema):
        stmt = select(VerificationCode).where(VerificationCode.email == data.email).order_by(VerificationCode.created_at.desc()).limit(1)
        lc = session.exec(stmt).first()
        if not lc or lc.expires_at < datetime.now():
            raise HTTPException(status_code=400, detail="Код устарел")
        if lc.code != data.code:
            raise HTTPException(status_code=400, detail="Неверный код")
        user = get_user_by_email(session, data.email)
        if not user:
            user = User(email=data.email)
            session.add(user)
            session.commit()
            session.refresh(user)
        access_token = create_access_token({"sub": user.email})
        return {"msg": f"{'Авторизация' if user else 'Регистрация'} выполнена","access_token": access_token}

