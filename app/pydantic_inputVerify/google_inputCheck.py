from pydantic import BaseModel

class GoogleLoginRequest(BaseModel):
    id_token: str  # the credential returned by Google Identity Services on the frontend


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"