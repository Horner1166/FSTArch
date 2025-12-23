from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Optional
from api.utils import get_current_user, get_optional_user
from models.models import User, UserRole, Post, ModerationStatus
from schemas.post import PostCreate, PostUpdate, PostResponse
from db import get_session

router = APIRouter()

@router.post("/[.post]", response_model=PostResponse, status_code=201)
def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Создать пост"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Вы забанены и не можете создавать посты")
    
    post = Post(
        title=post_data.title,
        content=post_data.content,
        user_id=current_user.id,
        user_email = current_user.email
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

@router.get("/[.get]", response_model=List[PostResponse])
def get_all_posts(session: Session = Depends(get_session)):
    """Получить все одобренные посты"""
    stmt = select(Post).where(Post.moderation_status == ModerationStatus.APPROVED).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    return posts

@router.get("/:id/[.get]", response_model=PostResponse)
def get_post(post_id: int, current_user: Optional[User] = Depends(get_optional_user), session: Session = Depends(get_session)):
    """Получить пост по ID"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    if current_user and current_user.role == UserRole.ADMIN:
        return post
    
    if current_user and post.user_id == current_user.id:
        return post
    
    if post.moderation_status != ModerationStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    return post

@router.put("/:id/[.put]", response_model=PostResponse)
def update_post(post_id: int, post_data: PostUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Редактировать пост по ID"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    if post_data.title is not None:
        post.title = post_data.title
    if post_data.content is not None:
        post.content = post_data.content
    
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

@router.delete("/:id/[.delete]", status_code=204)
def delete_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Удалить пост по ID"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    session.delete(post)
    session.commit()
    return None

@router.get("/:user_id/[.get]", response_model=List[PostResponse])
def get_user_posts(user_id: int, current_user: Optional[User] = Depends(get_optional_user), session: Session = Depends(get_session)):
    """Получить посты пользователя"""
    if current_user and current_user.role == UserRole.ADMIN:
        stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    elif current_user and current_user.id == user_id:
        stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    else:
        stmt = select(Post).where(
            Post.user_id == user_id,
            Post.moderation_status == ModerationStatus.APPROVED
        ).order_by(Post.created_at.desc())
    
    posts = session.exec(stmt).all()
    return posts