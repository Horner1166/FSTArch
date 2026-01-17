import uuid
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

class ModerationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class RejectBody(SQLModel):
    reason: str

class User(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    username: str = Field(index=True, nullable=False, unique=True)
    is_active: bool = True
    is_banned: bool = Field(default=False, index=True)
    role: UserRole = Field(default=UserRole.USER)
    created_at: datetime = Field(default_factory=datetime.now)
    last_username_change_at: Optional[datetime] = Field(default=None)
    posts: list["Post"] = Relationship(back_populates="user")

class VerificationCode(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    code: str
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime

class PostImage(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    post_id: Optional[uuid.UUID] = Field(foreign_key="post.id", nullable=False)
    image_url: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.now)
    post: Optional["Post"] = Relationship(back_populates="images")

class Post(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(nullable=False)
    content: str = Field(nullable=False)
    contact: str = Field(nullable=False)
    city: Optional[str] = Field(default=None)
    street: Optional[str] = Field(default=None)
    price: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)
    user_id: Optional[uuid.UUID] = Field(foreign_key="user.id")
    username: str = Field(index=True, nullable=False)
    moderation_status: ModerationStatus = Field(default=ModerationStatus.PENDING, index=True)
    rejection_reason: Optional[str] = Field(default=None)
    user: Optional["User"] = Relationship(back_populates="posts")
    images: List["PostImage"] = Relationship(
        back_populates="post",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )