from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, EmailStr, Field
from typing import List
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.core.security import hash_password
from app.models.user import User
from app.models.restaurant import Restaurant
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

class RestaurantOut(BaseModel):
    id: int
    code: str
    name: str

class RestaurantCreateIn(BaseModel):
    code: str = Field(min_length=2)
    name: str = Field(min_length=2)

class UserRestaurantsIn(BaseModel):
    restaurant_codes: list[str] = Field(min_length=1)

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

@router.get("/restaurants", response_model=List[RestaurantOut])
def list_restaurants(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
):
    rows = db.query(Restaurant).order_by(Restaurant.code.asc()).all()
    return [RestaurantOut(id=r.id, code=r.code, name=r.name) for r in rows]

@router.post("/restaurants", response_model=RestaurantOut)
def create_restaurant(
    payload: RestaurantCreateIn,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
):
    code = payload.code.strip().upper()
    name = payload.name.strip()
    existing = db.query(Restaurant).filter(Restaurant.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Restaurant code already exists")
    restaurant = Restaurant(code=code, name=name)
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return RestaurantOut(id=restaurant.id, code=restaurant.code, name=restaurant.name)

@router.put("/users/{user_id}/restaurants", response_model=List[RestaurantOut])
def set_user_restaurants(
    user_id: int = Path(..., ge=1),
    payload: UserRestaurantsIn | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    codes = [c.strip().upper() for c in (payload.restaurant_codes if payload else [])]
    if not codes:
        raise HTTPException(status_code=400, detail="restaurant_codes is required")

    restaurants = db.query(Restaurant).filter(Restaurant.code.in_(codes)).all()
    found = {r.code for r in restaurants}
    missing = [c for c in codes if c not in found]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown restaurant codes: {', '.join(missing)}")

    user.restaurants = restaurants
    db.commit()
    db.refresh(user)

    return [RestaurantOut(id=r.id, code=r.code, name=r.name) for r in user.restaurants]

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
