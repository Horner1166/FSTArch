from fastapi import FastAPI
from api import auth_routes
from db import init_db
from fastapi.openapi.utils import get_openapi
app = FastAPI(title="FastAPI Email Auth Example")

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])

@app.on_event("startup")
def startup():
    init_db()

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Авторизация",
        version="0.1",
        description="",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "Авторизация": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
