from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

class VerificationCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    purpose: str
    code: str
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime