from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from models.models import ModerationStatus

class PostCreate(BaseModel):
    title: str
    content: str
    contact: str
    city: Optional[str] = None
    street: Optional[str] = None
    price: Optional[str] = None

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    contact: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    price: Optional[str] = None

class PostImageResponse(BaseModel):
    id: UUID
    image_url: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PostResponse(BaseModel):
    id: UUID
    title: str
    content: str
    contact: str
    city: Optional[str] = None
    street: Optional[str] = None
    price: Optional[str] = None
    created_at: datetime
    user_id: Optional[UUID] = None
    username: str
    moderation_status: ModerationStatus

    rejection_reason: Optional[str] = None
    images: List[PostImageResponse] = []
    
    class Config:
        from_attributes = True