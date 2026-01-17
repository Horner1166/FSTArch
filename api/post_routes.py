from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from api.utils import get_current_user, get_optional_user
from models.models import User, UserRole, Post, ModerationStatus, PostImage
from schemas.post import PostCreate, PostUpdate, PostResponse
from db import get_session
from core.upload_config import delete_file_from_s3

router = APIRouter()

@router.post("/[.post]", response_model=PostResponse, status_code=201)
def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Создать пост"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Вы забанены и не можете создавать посты")
    
    post = Post(
        title=post_data.title,
        content=post_data.content,
        contact=post_data.contact,
        city=post_data.city,
        street=post_data.street,
        price=post_data.price,
        user_id=current_user.id,
        username = current_user.username
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    post.images = []
    return post

@router.get("/[.get]", response_model=List[PostResponse])
def get_all_posts(session: Session = Depends(get_session)):
    """Получить все одобренные посты"""
    stmt = select(Post).where(Post.moderation_status == ModerationStatus.APPROVED).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    for post in posts:
        post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    return posts

@router.get("/:id/[.get]", response_model=PostResponse)
def get_post(post_id: UUID, current_user: Optional[User] = Depends(get_optional_user), session: Session = Depends(get_session)):
    """Получить пост по ID"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    
    if current_user and current_user.role == UserRole.ADMIN:
        return post
    
    if current_user and post.user_id == current_user.id:
        return post
    
    if post.moderation_status != ModerationStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    return post

@router.put("/:id/[.put]", response_model=PostResponse)
def update_post(post_id: UUID, post_data: PostUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
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
    if post_data.contact is not None:
        post.contact = post_data.contact

    if post_data.city is not None:
        post.city = post_data.city
    if post_data.street is not None:
        post.street = post_data.street
    if post_data.price is not None:
        post.price = post_data.price

    post.moderation_status = ModerationStatus.PENDING

    session.add(post)
    session.commit()
    session.refresh(post)
    post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    return post

@router.delete("/:id/[.delete]", status_code=204)
def delete_post(post_id: UUID, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Удалить пост по ID и все связанные изображения"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()

    for image in images:
        delete_file_from_s3(image.image_url)

    session.delete(post)
    session.commit()
    return post.images

@router.get("/:user_id/[.get]", response_model=List[PostResponse])
def get_user_posts(user_id: UUID, current_user: Optional[User] = Depends(get_optional_user), session: Session = Depends(get_session)):
    """Получить посты пользователя"""
    if current_user and (current_user.role == UserRole.ADMIN or current_user.id == user_id):
        stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    else:
        stmt = select(Post).where(
            Post.user_id == user_id,
            Post.moderation_status == ModerationStatus.APPROVED
        ).order_by(Post.created_at.desc())
    
    posts = session.exec(stmt).all()
    for post in posts:
        post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    return posts