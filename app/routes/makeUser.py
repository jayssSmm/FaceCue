from app.models.user import User
from app.extension import GOOGLE_CLIENT_ID
from fastapi import APIRouter, Depends, HTTPException
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from app.pydantic_inputVerify.auth_inputCheck import SignupRequest, LoginRequest, UserOut
from app.pydantic_inputVerify.google_inputCheck import GoogleLoginRequest, TokenResponse
from app.PasswdHandling.hashPasswd import hash_password, verify_password
from app.JWT.createToken import create_access_token
from app.db_DataHandling.getSession import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/auth/signup", response_model=TokenResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not user.hashed_password:
        # Either no such user, or they signed up via Google and have no password
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/auth/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google login not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # idinfo contains: sub, email, email_verified, name, picture, etc.
    if not idinfo.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google email not verified")

    google_sub = idinfo["sub"]
    email = idinfo["email"]

    user = db.query(User).filter(User.google_sub == google_sub).first()

    if not user:
        # Check if an account with this email already exists (e.g. local signup)
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link the existing account to Google
            user.google_sub = google_sub
            if user.auth_provider == "local":
                user.auth_provider = "local+google"
        else:
            user = User(
                email=email,
                full_name=idinfo.get("name"),
                auth_provider="google",
                google_sub=google_sub,
                hashed_password=None,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)