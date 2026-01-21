from sqlmodel import SQLModel, create_engine, Session

from core.config import settings

DB_URL = settings.DATABASE_URL
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
session = Session(autocommit=False, autoflush=False, bind=engine)


def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session