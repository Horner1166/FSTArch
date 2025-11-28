from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.models import ModerationStatus

class PostCreate(BaseModel):
    title: str
    content: str

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    user_id: int
    user_email: str
    moderation_status: ModerationStatus
    
    class Config:
        from_attributes = True