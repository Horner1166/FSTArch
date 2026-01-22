from datetime import timedelta, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlmodel import Session, select
from api.utils import get_current_user
from models.models import User, Post, PostImage
from schemas.auth import UpdateUsernameSchema
from db import get_session

router = APIRouter()

@router.put("/[.put]")
def update_username(data: UpdateUsernameSchema, current_user: User = Depends(get_current_user),
                    session: Session = Depends(get_session), ):
    """Изменить свой ник.
    Ограничение: после сохранения ника следующую смену можно делать только через 30 дней."""
    if not data.username or len(data.username.strip()) == 0:
        raise HTTPException(status_code=400, detail="Ник не может быть пустым")

    username = data.username.strip()

    user = session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.username == username:
        return {"msg": "Ник не изменён (значение то же самое)", "username": user.username}

    now = datetime.now()

    if user.last_username_change_at is not None:
        next_change_allowed = user.last_username_change_at + timedelta(days=30)
        if now < next_change_allowed:
            raise HTTPException(
                status_code=400,
                detail="Ник можно менять не чаще, чем раз в 30 дней",
            )

    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user and existing_user.id != user.id:
        raise HTTPException(status_code=400, detail="Этот ник уже занят")

    user.username = username
    user.last_username_change_at = now
    session.add(user)

    # Обновляем ник во всех постах пользователя
    user_posts = session.exec(select(Post).where(Post.user_id == user.id)).all()
    for post in user_posts:
        post.username = username
        session.add(post)

    session.commit()
    session.refresh(user)

    return {"msg": f"Ник успешно изменен на {username}", "username": user.username}


@router.get("/[.get]")
def get_me(current_user: User = Depends(get_current_user)):
    """Получить данные текущего пользователя."""
    now = datetime.now()

    if current_user.last_username_change_at:
        next_username_change_at = current_user.last_username_change_at + timedelta(days=30)
        can_change_username = now >= next_username_change_at
    else:
        next_username_change_at = None
        can_change_username = True

    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
        "is_banned": current_user.is_banned,
        "created_at": current_user.created_at,
        "last_username_change_at": current_user.last_username_change_at,
        "next_username_change_at": next_username_change_at,
        "can_change_username": can_change_username,
    }