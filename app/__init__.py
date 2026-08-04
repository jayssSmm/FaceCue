from fastapi import FastAPI
from app.routes.makeUser import router as sigin_router
from fastapi.middleware.cors import CORSMiddleware

def create_app():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["POST"],
        allow_headers=["*"],
    )

    app.include_router(sigin_router)

    return app