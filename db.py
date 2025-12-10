import os
from sqlmodel import SQLModel, create_engine, Session, select
from models.models import User, UserRole
from core.config import settings

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./fastapi_auth.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
session = Session(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    with Session(engine) as session:
        admin1 = session.exec(select(User).where(User.email == settings.ADMIN_EMAIL)).first()
        if not admin1:
            admin1 = User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin1)
            session.commit()
            print(f"Администратор создан: {settings.ADMIN_EMAIL}")

        admin2 = session.exec(select(User).where(User.email == settings.ADMIN2_EMAIL)).first()
        if not admin2:
            admin2 = User(
                username=settings.ADMIN2_USERNAME,
                email=settings.ADMIN2_EMAIL,
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin2)
            session.commit()
            print(f"Администратор создан: {settings.ADMIN2_EMAIL}")

def init_db():
    SQLModel.metadata.create_all(engine)
    create_admin_user()

def get_session():
    with Session(engine) as session:
        yield session