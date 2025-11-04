from contextlib import asynccontextmanager

from fastapi import FastAPI
from api import auth_routes, post_routes, admin_routes
from db import init_db
from core.cleanup import start_cleanup_thread

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_cleanup_thread()
    yield
app = FastAPI(title="Авторизация", description="Авторизация по email", version="0.1", lifespan=lifespan)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(post_routes.router, prefix="/posts", tags=["Posts"])
#app.include_router(admin_routes.router, prefix="/admin", tags=["Admin"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
