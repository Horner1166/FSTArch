from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import auth_routes, post_routes, admin_routes, moderator_routes, uploads
from db import init_db
from core.cleanup import start_cleanup_thread


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_cleanup_thread()
    yield


app = FastAPI(
    title="DN",
    description="",
    version="0.4",
    lifespan=lifespan,
)

# Настройка CORS, чтобы фронтенд на другом домене/порте мог обращаться к API
# Для продакшена рекомендуется явно перечислить допустимые origins вместо ["*"].
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth Functions"])
app.include_router(post_routes.router, prefix="/posts", tags=["Posts Functions"])
app.include_router(uploads.router, prefix="/upload", tags=["Upload Functions"])
app.include_router(moderator_routes.router, prefix="/moderator", tags=["Moderator Functions"])
app.include_router(admin_routes.router, prefix="/admin", tags=["Admin Functions"])

# Откройте в браузере: http://localhost:8000/app
app.mount(
    "/app",
    StaticFiles(directory="JS", html=True),
    name="frontend",
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)