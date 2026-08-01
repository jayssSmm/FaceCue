from fastapi import FastAPI
from app.routes.makeUser import router as sigin_router

def create_app():
    app = FastAPI()
    app.include_router(sigin_router)

    return app