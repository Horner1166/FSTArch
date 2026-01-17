import os
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy import text
from models.models import User, UserRole
from core.config import settings

DB_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://ypcgjipgmzqdeixvdvar:kqskklptpdzdbqzeslgwpbjlgyodwa@9qasp5v56q8ckkf5dc.leapcellpool.com:6438/myzecpnpmihdjehpzoas?sslmode=require")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
session = Session(autocommit=False, autoflush=False, bind=engine)


# def _migrate_sqlite_post_table():
#     if not DB_URL.startswith("sqlite"):
#         return
#
#     with engine.begin() as conn:
#         # If the table doesn't exist yet, create_all will create it.
#         res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='post'"))
#         if res.first() is None:
#             return
#
#         cols_res = conn.execute(text("PRAGMA table_info(post)"))
#         existing_cols = {row[1] for row in cols_res.fetchall()}
#
#         to_add = {
#             "city": "TEXT",
#             "street": "TEXT",
#             "price": "TEXT",
#             "rejection_reason": "TEXT"
#         }
#
#         for col, col_type in to_add.items():
#             if col not in existing_cols:
#                 conn.execute(text(f"ALTER TABLE post ADD COLUMN {col} {col_type}"))

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
    #_migrate_sqlite_post_table()
    create_admin_user()

def get_session():
    with Session(engine) as session:
        yield session