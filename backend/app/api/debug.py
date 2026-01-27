from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, EmailStr, Field
from typing import List
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.core.security import hash_password
from app.models.user import User
from app.core.audit import write_audit_log
from app.core.utils import normalize_email

router = APIRouter(prefix="/debug", tags=["debug"])

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role

@router.post("/create-user")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
): 
    email = normalize_email(payload.email)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        is_active=True,
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    write_audit_log(
        db=db,
        action="debug.user.create",
        actor_email=_user.email,
        target=f"user:{user.id} email={user.email} role={user.role}",
    )

    return {"id": user.id, "email": user.email, "role": user.role}

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserOut(id=u.id, email=u.email, role=u.role, is_active=u.is_active)
        for u in users
    ]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
):
    # protection : ne jamais supprimer soi-même
    if user_id == _user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # protection : ne jamais supprimer un DEV (optionnel mais recommandé)
    if target.role == Role.DEV.value:
        raise HTTPException(status_code=400, detail="Cannot delete a DEV user")

    db.delete(target)
    db.commit()

    write_audit_log(
        db=db,
        action="debug.user.delete",
        actor_email=_user.email,
        target=f"user:{user_id} email={target.email} role={target.role}",
    )
    return {"ok": True}