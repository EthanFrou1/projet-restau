from datetime import datetime, timezone
import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password
from app.core.jwt import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.db.users import get_user_by_email, get_user_by_id
from app.api.auth_deps import get_current_user
from app.core.audit import write_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)

    if not user or not verify_password(payload.password, user.hashed_password):
        # audit échec
        write_audit_log(db, "auth.login.failed", payload.email, "route:/auth/login")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token, expires_at = create_access_token(subject=str(user.id))
    refresh_token, refresh_expires_at = create_refresh_token(subject=str(user.id))

    # cookie refresh: secure en prod, pas en dev
    secure_cookie = os.getenv("ENV", "dev") != "dev"

    max_age = int((refresh_expires_at - datetime.now(timezone.utc)).total_seconds())

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=secure_cookie,
        max_age=max_age,
        path="/",
    )

    # audit succès
    write_audit_log(db, "auth.login.success", user.email, f"user:{user.id}")

    return {
        "access_token": access_token,
        "expires_at": expires_at.isoformat(),
    }


@router.post("/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        write_audit_log(db, "auth.refresh.missing", "unknown", "cookie:refresh_token")
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = decode_refresh_token(token)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("Missing sub")
        user_id = int(sub)
    except Exception:
        write_audit_log(db, "auth.refresh.invalid", "unknown", "cookie:refresh_token")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = get_user_by_id(db, user_id)
    if not user:
        write_audit_log(db, "auth.refresh.user_not_found", "unknown", f"user_id:{user_id}")
        raise HTTPException(status_code=401, detail="User not found")

    access_token, expires_at = create_access_token(subject=str(user.id))
    write_audit_log(db, "auth.refresh.success", user.email, f"user:{user.id}")

    return {"access_token": access_token, "expires_at": expires_at.isoformat()}


@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db), user=Depends(get_current_user)):
    response.delete_cookie("refresh_token", path="/")
    write_audit_log(db, "auth.logout", user.email, f"user:{user.id}")
    return {"ok": True}


@router.get("/me")
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    write_audit_log(db, "auth.me", user.email, f"user:{user.id}")
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
    }
