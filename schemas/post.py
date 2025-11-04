from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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
    
    class Config:
        from_attributes = True


