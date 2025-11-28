from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List
from api.utils import get_current_user
from models.models import User, UserRole, Post, ModerationStatus
from schemas.post import PostResponse
from db import get_session

router = APIRouter()

@router.post("/set-admin/{user_email}")
def set_user_as_admin(user_email: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Сделать пользователя админом"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    target_user = session.exec(select(User).where(User.email == user_email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    target_user.role = UserRole.ADMIN
    session.add(target_user)
    session.commit()
    
    return {"msg": f"Пользователь {user_email} теперь администратор"}

@router.post("/remove-admin/{user_email}")
def remove_admin_role(user_email: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Убрать админку"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    if current_user.email == user_email:
        raise HTTPException(status_code=400, detail="Нельзя убрать права администратора у себя")

    target_user = session.exec(select(User).where(User.email == user_email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    target_user.role = UserRole.GUEST
    session.add(target_user)
    session.commit()
    
    return {"msg": f"Роль администратора удалена у пользователя {user_email}"}

@router.get("/users")
def list_users(current_user: User = Depends(get_current_user),session: Session = Depends(get_session)):
    """Получить список всех пользователей"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    users = session.exec(select(User)).all()
    return [{"id": user.id, "email": user.email, "role": user.role, "created_at": user.created_at} for user in users]

@router.get("/posts/pending", response_model=List[PostResponse])
def get_pending_posts(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Получить все непромодерированные посты"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    stmt = select(Post).where(Post.moderation_status == ModerationStatus.PENDING).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    return posts

@router.post("/posts/{post_id}/approve", response_model=PostResponse)
def approve_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Одобрить и опубликовать пост"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    post.moderation_status = ModerationStatus.APPROVED
    session.add(post)
    session.commit()
    session.refresh(post)
    
    return post

@router.post("/posts/{post_id}/reject")
def reject_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Отклонить и удалить пост"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    session.delete(post)
    session.commit()
    
    return {"msg": f"Пост №{post_id} отклонен и удален"}