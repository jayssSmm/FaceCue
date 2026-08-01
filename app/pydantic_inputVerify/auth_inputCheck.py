from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    auth_provider: str

    model_config = ConfigDict(from_attributes=True)

