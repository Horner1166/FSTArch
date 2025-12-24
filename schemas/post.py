from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.models import ModerationStatus

class PostCreate(BaseModel):
    title: str
    content: str
    contact: str
class PostUpdate(BaseModel):
    title: str
    content: str
    contact: str

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    contact: str
    created_at: datetime
    user_id: int
    username: str
    moderation_status: ModerationStatus
    
    class Config:
        from_attributes = True