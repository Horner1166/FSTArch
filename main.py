from contextlib import asynccontextmanager

from fastapi import FastAPI
from api import auth_routes, post_routes, admin_routes, moderator_routes
from db import init_db
from core.cleanup import start_cleanup_thread

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_cleanup_thread()
    yield
app = FastAPI(title="Progr", description="Авторизация по email", version="0.3", lifespan=lifespan)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth Functions"])
app.include_router(post_routes.router, prefix="/posts", tags=["Posts Functions"])
app.include_router(moderator_routes.router, prefix="/moderator", tags=["Moderator Functions"])
app.include_router(admin_routes.router, prefix="/admin", tags=["Admin Functions"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)