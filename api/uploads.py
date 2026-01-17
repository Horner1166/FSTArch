from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from api.utils import get_current_user
from core.upload_config import upload_file_to_s3
from models.models import User, UserRole , Post, PostImage
from db import get_session

router = APIRouter()

@router.post("/uploads/image")
def upload_image(current_user: User = Depends(get_current_user), session: Session = Depends(get_session), file: UploadFile = File(...)):
    url = upload_file_to_s3(file)
    return {"url": url}

@router.post("/uploads/post/{post_id}/images")
def upload_post_images(post_id: UUID, files: List[UploadFile] = File(...), current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Загрузить до 10 изображений для поста"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Можно загрузить максимум 10 изображений")

    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    
    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    existing_images = session.exec(select(PostImage).where(PostImage.post_id == post.id)).all()
    if len(existing_images) + len(files) > 10:
        raise HTTPException(
            status_code=400, 
            detail=f"У поста уже {len(existing_images)} изображений. Можно добавить максимум {10 - len(existing_images)}"
        )
    
    uploaded_images = []
    for file in files:
        url = upload_file_to_s3(file)
        post_image = PostImage(post_id=post.id, image_url=url)
        session.add(post_image)
        uploaded_images.append({"id": str(post_image.id), "url": url})
    
    session.commit()
    return {"images": uploaded_images}