import os
from sqlmodel import SQLModel, create_engine, Session

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./fastapi_auth.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session