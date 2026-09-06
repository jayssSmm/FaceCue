from fastapi import FastAPI
from app.routes.makeUser import router as sigin_router
from app.routes.useDdamfn import router as ddamfn_image_handle
from app.routes.response import router as response_router
from app.routes.getUser import router as get_user_router
from app.routes.ping import router as ping
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

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
    app.include_router(response_router)
    app.include_router(get_user_router)
    app.include_router(ping)
    app.mount("/", StaticFiles(directory="templates", html=True), name="static")

    return app