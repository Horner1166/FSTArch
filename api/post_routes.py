from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from api.utils import get_current_user, get_optional_user
from models.models import User, UserRole, Post, ModerationStatus, PostImage
from schemas.post import PostResponse
from db import get_session
from core.upload_config import delete_file_from_s3, upload_file_to_s3

router = APIRouter()

@router.post("/[.post]", response_model=PostResponse, status_code=201)
def create_post(
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session)
):
    """Создать пост с возможностью загрузки до 10 изображений"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Вы забанены и не можете создавать посты")

    if images and len(images) > 10:
        raise HTTPException(status_code=400, detail="Можно загрузить максимум 10 изображений")

    post = Post(
        title=title,
        content=content,
        contact=contact,
        city=city,
        street=street,
        price=price,
        user_id=current_user.id,
        username=current_user.username
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    if images:
        for file in images:
            url = upload_file_to_s3(file)
            post_image = PostImage(post_id=post.id, image_url=url)
            session.add(post_image)
        session.commit()
        session.refresh(post)

    post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
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
def update_post(
    post_id: UUID,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    replace_images: bool = Form(False),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    """Редактировать пост по ID. Можно заменить все изображения или добавить новые (до 10 в сумме)."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    # Обновляем текстовые поля, если переданы
    if title is not None:
        post.title = title
    if content is not None:
        post.content = content
    if contact is not None:
        post.contact = contact
    if city is not None:
        post.city = city
    if street is not None:
        post.street = street
    if price is not None:
        post.price = price

    post.moderation_status = ModerationStatus.PENDING

    # Если переданы файлы, либо заменяем, либо добавляем
    if images is not None:
        existing_images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()

        if replace_images:
            to_delete = existing_images
            remaining = 0
        else:
            to_delete = []
            remaining = len(existing_images)

        if remaining + len(images) > 10:
            raise HTTPException(
                status_code=400,
                detail=f"Можно максимум 10 изображений. Сейчас {remaining}, новых {len(images)}"
            )

        for image in to_delete:
            delete_file_from_s3(image.image_url)
            session.delete(image)

        # Загружаем новые изображения
        for file in images:
            url = upload_file_to_s3(file)
            session.add(PostImage(post_id=post.id, image_url=url))

    session.add(post)
    session.commit()
    session.refresh(post)
    post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    return post

@router.delete("/:id/[.delete]", status_code=204)
def delete_post(post_id: UUID, current_user: Optional[User] = Depends(get_current_user), session: Session = Depends(get_session)):
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
    return post

@router.get("/:user_id/[.get]", response_model=List[PostResponse])
def get_user_posts(user_id: UUID, current_user: Optional[User] = Depends(get_optional_user), session: Session = Depends(get_session)):
    """Получить посты пользователя"""
    if current_user and (current_user.role == UserRole.ADMIN or current_user.id == user_id):
        stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    else:
        stmt = select(Post).where(Post.user_id == user_id, Post.moderation_status == ModerationStatus.APPROVED).order_by(Post.created_at.desc())
    
    posts = session.exec(stmt).all()
    for post in posts:
        post.images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    return posts

@router.get("/search/[.get]", response_model=List[PostResponse])
def search_posts(
    query: str = Query(..., min_length=1, max_length=200, description="Строка поиска"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session)
):
    """Полнотекстовый поиск по одобренным постам"""
    ts_query = func.plainto_tsquery("russian", query).op("||")(func.plainto_tsquery("english", query))
    stmt = (
        select(Post)
        .options(selectinload(Post.images))
        .where(
            Post.moderation_status == ModerationStatus.APPROVED,
            Post.search_vector.op('@@')(ts_query),
        )
        .order_by(desc(func.ts_rank_cd(Post.search_vector, ts_query)))
        .limit(limit)
        .offset(offset)
    )
    return session.exec(stmt).all()