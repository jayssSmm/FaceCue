from fastapi import FastAPI
from app.routes.makeUser import router as sigin_router
from app.routes.useDdamfn import router as ddamfn_image_handle
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
    app.include_router(ddamfn_image_handle)

    return app