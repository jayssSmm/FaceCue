from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, ConfigDict, Field, SecretStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=8)
    full_name: Optional[str] = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    auth_provider: Literal["local", "google"]

    model_config = ConfigDict(from_attributes=True)
