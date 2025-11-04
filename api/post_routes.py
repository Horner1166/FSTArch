from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List
from api.utils import get_current_user
from models.models import User, UserRole, Post
from schemas.post import PostCreate, PostUpdate, PostResponse
from db import get_session

router = APIRouter()

@router.post("/create_post", response_model=PostResponse, status_code=201)
def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    post = Post(
        title=post_data.title,
        content=post_data.content,
        user_id=current_user.id
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

@router.get("/get_all", response_model=List[PostResponse])
def get_all_posts(session: Session = Depends(get_session)):
    stmt = select(Post).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    return posts

@router.get("/get_post_{post_id}", response_model=PostResponse)
def get_post(post_id: int, session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    return post

@router.put("/update_post_{post_id}", response_model=PostResponse)
def update_post(post_id: int, post_data: PostUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
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

@router.delete("/delete_post_{post_id}", status_code=204)
def delete_post(post_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    if post.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    
    session.delete(post)
    session.commit()
    return None

@router.get("/get_posts_{user_id}", response_model=List[PostResponse])
def get_user_posts(user_id: int, session: Session = Depends(get_session)):
    stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    posts = session.exec(stmt).all()
    return posts

