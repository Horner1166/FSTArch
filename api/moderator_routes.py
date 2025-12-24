from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List
from api.utils import get_current_user
from models.models import User, UserRole, Post, ModerationStatus
from schemas.post import PostResponse
from db import get_session


router = APIRouter()


@router.get("/posts/[.get]", response_model=List[PostResponse])
def get_pending_posts(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Получить все непромодерированные посты"""
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    stmt = select(Post).where(Post.moderation_status == ModerationStatus.PENDING).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    return posts


@router.post("/posts/:id/[.post]", response_model=PostResponse)
def approve_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Одобрить и опубликовать пост"""
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    post.moderation_status = ModerationStatus.APPROVED
    session.add(post)
    session.commit()
    session.refresh(post)

    return post


@router.delete("/posts/:id/[.delete]")
def reject_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Отклонить и удалить пост"""
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    session.delete(post)
    session.commit()

    return {"msg": f"Пост №{post_id} отклонен и удален"}


@router.get("/users/[.get]")
def list_users(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Получить список всех пользователей"""
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    users = session.exec(select(User)).all()
    return [{"id": user.id, "username": user.username, "email": user.email, "role": user.role, "created_at": user.created_at} for user in users]


@router.post("/users/:id/[.post]")
def change_ban_status(user_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Разбанить пользователя или забанить и удалить все его посты."""
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.role != UserRole.USER:
        raise HTTPException(status_code=400, detail="Можно банить только пользователей")

    if user.role != UserRole.USER:
        raise HTTPException(status_code=400, detail="Можно разбанивать только пользователей")

    user_posts = session.exec(select(Post).where(Post.user_id == user_id)).all()
    for post in user_posts:
        session.delete(post)

    if not user.is_banned:
        user.is_banned = True

    elif user.is_banned:
        user.is_banned = False

    session.add(user)
    session.commit()
    session.refresh(user)

    return {"msg": f"Пользователь {user.username} {'забанен' if user.is_banned == True else 'разбанен'}.","username": user.username,"user_id": user.id,"email": user.email,}