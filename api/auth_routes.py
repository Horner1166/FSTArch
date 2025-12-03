from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlmodel import Session, select
from datetime import datetime
from api.utils import get_user_by_email, create_and_send_code, generate_unique_username, get_current_user
from core.security import create_access_token
from models.models import User, VerificationCode
from schemas.auth import RequestCodeSchema, ConfirmCodeSchema, UpdateUsernameSchema
from db import session, get_session

router = APIRouter()

@router.post("/request-code", status_code=200)
def request_code(data: RequestCodeSchema, background_tasks: BackgroundTasks):
    """Запрос кода"""    
    user = get_user_by_email(session, data.email)
    if user:
        subject = "Код для входа"
        body = "Ваш код для входа: {code}."
    else:
        subject = "Код для регистрации"
        body = "Ваш код для регистрации: {code}."

    create_and_send_code(background_tasks,session,data.email,subject,body)
    return {"msg": f"Код для {'входа' if user else 'регистрации'} отправлен на email"}

@router.post("/authorize")
def verify_login_code(data: ConfirmCodeSchema):
    """Авторизация"""
    stmt = select(VerificationCode).where(VerificationCode.email == data.email).order_by(VerificationCode.created_at.desc()).limit(1)
    lc = session.exec(stmt).first()
    if not lc or lc.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="Код устарел")
    if lc.code != data.code:
        raise HTTPException(status_code=400, detail="Неверный код")
    user = get_user_by_email(session, data.email)
    if not user:
        username = generate_unique_username(session)
        user = User(email=data.email, username=username)
        session.add(user)
        session.commit()
        session.refresh(user)
    access_token = create_access_token({"sub": user.email})
    return {"msg": f"{'Авторизация' if user else 'Регистрация'} выполнена","access_token": access_token}

@router.put("/update-username")
def update_username(data: UpdateUsernameSchema, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Изменить свой ник"""
    if not data.username or len(data.username.strip()) == 0:
        raise HTTPException(status_code=400, detail="Ник не может быть пустым")
    
    username = data.username.strip()
    
    user = session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user and existing_user.id != user.id:
        raise HTTPException(status_code=400, detail="Этот ник уже занят")
    
    user.username = username
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {"msg": f"Ник успешно изменен на {username}", "username": user.username}

