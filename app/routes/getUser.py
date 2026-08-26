from fastapi import APIRouter, Depends
from app.models.user import User
from app.db_DataHandling.getUser import get_current_user
from app.pydantic_inputVerify.auth_inputCheck import UserOut

router = APIRouter()

@router.get("/users/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user