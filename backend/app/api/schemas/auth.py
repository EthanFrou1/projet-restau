from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    expires_at: str
    must_change_password: bool


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    first_name: str | None = None
    last_name: str | None = None
    must_change_password: bool


class FirstLoginPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str
