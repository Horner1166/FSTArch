import os
from sqlmodel import SQLModel, create_engine, Session, select
from models.models import User, UserRole
from core.config import settings

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./fastapi_auth.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
session = Session(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    """Создает администратора при запуске приложения, если его еще нет"""
    with Session(engine) as session:
        admin = session.exec(select(User).where(User.email == settings.ADMIN_EMAIL)).first()
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin)
            session.commit()
            print(f"Администратор создан: {settings.ADMIN_EMAIL}")

def init_db():
    SQLModel.metadata.create_all(engine)
    create_admin_user()

def get_session():
    with Session(engine) as session:
        yield session