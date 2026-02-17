from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, EmailStr, Field
from typing import List
from sqlalchemy.orm import Session, joinedload
import secrets
import string

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.core.security import hash_password
from app.core.email import send_temporary_password_email
from app.models.user import User
from app.models.restaurant import Restaurant
from app.core.audit import write_audit_log
from app.core.utils import normalize_email

router = APIRouter(prefix="/debug", tags=["debug"])

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str | None = Field(default=None, min_length=8)
    role: Role
    first_name: str | None = None
    last_name: str | None = None


class CreateUserResponse(BaseModel):
    id: int
    email: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    must_change_password: bool
    email_sent: bool
    email_error: str | None = None


@router.post("/create-user", response_model=CreateUserResponse)
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
): 
    if _user.role == Role.ADMIN.value and payload.role not in (Role.MANAGER, Role.READONLY):
        raise HTTPException(status_code=403, detail="Un admin peut uniquement créer des utilisateurs MANAGER ou READONLY")

    email = normalize_email(payload.email)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email existe déjà")

    first_name = payload.first_name.strip() if payload.first_name else None
    last_name = payload.last_name.strip() if payload.last_name else None
    temp_password = payload.password or _generate_temporary_password()

    user = User(
        email=email,
        hashed_password=hash_password(temp_password),
        is_active=True,
        must_change_password=True,
        role=payload.role.value,
        first_name=first_name or None,
        last_name=last_name or None,
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
    email_sent, email_error = send_temporary_password_email(
        to_email=user.email,
        temp_password=temp_password,
        created_by_email=_user.email,
    )
    if email_sent:
        write_audit_log(
            db=db,
            action="debug.user.create.mail.sent",
            actor_email=_user.email,
            target=f"user:{user.id}",
        )
    else:
        write_audit_log(
            db=db,
            action="debug.user.create.mail.failed",
            actor_email=_user.email,
            target=f"user:{user.id} error:{email_error or 'unknown'}",
        )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "must_change_password": bool(user.must_change_password),
        "email_sent": email_sent,
        "email_error": email_error,
    }


def _generate_temporary_password(length: int = 14) -> str:
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%^&*()_+-=")
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-="
    remaining = [secrets.choice(alphabet) for _ in range(max(0, length - 4))]
    chars = [upper, lower, digit, special, *remaining]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    first_name: str | None = None
    last_name: str | None = None

class RestaurantOut(BaseModel):
    id: int
    code: str
    name: str

class UserWithRestaurantsOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    first_name: str | None = None
    last_name: str | None = None
    restaurants: list[RestaurantOut]

class RestaurantCreateIn(BaseModel):
    code: str = Field(min_length=2)
    name: str = Field(min_length=2)

class UserRestaurantsIn(BaseModel):
    restaurant_codes: list[str] = Field(default_factory=list)

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
):
    users = (
        db.query(User)
        .options(joinedload(User.restaurants))
        .order_by(User.id.asc())
        .all()
    )
    if _user.role == Role.ADMIN.value:
        admin_codes = {r.code for r in _user.restaurants}
        allowed_roles = {Role.MANAGER.value, Role.READONLY.value}
        users = [
            u
            for u in users
            if u.role in allowed_roles
            and (
                len(u.restaurants) == 0
                or any(r.code in admin_codes for r in u.restaurants)
            )
        ]
    return [
        UserOut(
            id=u.id,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            first_name=u.first_name,
            last_name=u.last_name,
        )
        for u in users
    ]

@router.get("/users-with-restaurants", response_model=List[UserWithRestaurantsOut])
def list_users_with_restaurants(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
):
    admin_codes = {r.code for r in _user.restaurants} if _user.role == Role.ADMIN.value else set()
    users = (
        db.query(User)
        .options(joinedload(User.restaurants))
        .order_by(User.id.asc())
        .all()
    )
    if _user.role == Role.ADMIN.value:
        allowed_roles = {Role.MANAGER.value, Role.READONLY.value}
        users = [
            u
            for u in users
            if u.role in allowed_roles
            and (
                len(u.restaurants) == 0
                or any(r.code in admin_codes for r in u.restaurants)
            )
        ]
    return [
        UserWithRestaurantsOut(
            id=u.id,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            first_name=u.first_name,
            last_name=u.last_name,
            restaurants=[
                RestaurantOut(id=r.id, code=r.code, name=r.name)
                for r in ([x for x in u.restaurants if x.code in admin_codes] if _user.role == Role.ADMIN.value else u.restaurants)
            ],
        )
        for u in users
    ]

@router.get("/restaurants", response_model=List[RestaurantOut])
def list_restaurants(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
):
    if _user.role == Role.ADMIN.value:
        return [
            RestaurantOut(id=r.id, code=r.code, name=r.name)
            for r in sorted(_user.restaurants, key=lambda x: x.code)
        ]
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
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    codes = [c.strip().upper() for c in (payload.restaurant_codes if payload else [])]

    restaurants: list[Restaurant] = []
    if codes:
        restaurants = db.query(Restaurant).filter(Restaurant.code.in_(codes)).all()
        found = {r.code for r in restaurants}
        missing = [c for c in codes if c not in found]
        if missing:
            raise HTTPException(status_code=400, detail=f"Unknown restaurant codes: {', '.join(missing)}")

    if _user.role == Role.ADMIN.value:
        admin_codes = {r.code for r in _user.restaurants}
        if user.role not in (Role.MANAGER.value, Role.READONLY.value):
            raise HTTPException(status_code=403, detail="Admin can only manage MANAGER or READONLY users")
        current_codes = {r.code for r in user.restaurants}
        if current_codes and current_codes.isdisjoint(admin_codes):
            raise HTTPException(status_code=403, detail="User is outside your restaurant scope")
        forbidden = [c for c in codes if c not in admin_codes]
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail=f"Restaurants outside your scope: {', '.join(forbidden)}",
            )
        outside_scope_restaurants = [r for r in user.restaurants if r.code not in admin_codes]
        scoped_restaurants = [r for r in restaurants if r.code in admin_codes]
        user.restaurants = outside_scope_restaurants + scoped_restaurants
        db.commit()
        db.refresh(user)
        return [RestaurantOut(id=r.id, code=r.code, name=r.name) for r in scoped_restaurants]

    user.restaurants = restaurants
    db.commit()
    db.refresh(user)

    return [RestaurantOut(id=r.id, code=r.code, name=r.name) for r in user.restaurants]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN])),
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

    if _user.role == Role.ADMIN.value:
        if target.role not in (Role.MANAGER.value, Role.READONLY.value):
            raise HTTPException(status_code=403, detail="Admin can only delete MANAGER or READONLY users")
        admin_codes = {r.code for r in _user.restaurants}
        target_codes = {r.code for r in target.restaurants}
        if not target_codes:
            raise HTTPException(status_code=403, detail="User is not associated to your restaurants")
        if not target_codes.issubset(admin_codes):
            raise HTTPException(status_code=403, detail="User is outside your restaurant scope")

    db.delete(target)
    db.commit()

    write_audit_log(
        db=db,
        action="debug.user.delete",
        actor_email=_user.email,
        target=f"user:{user_id} email={target.email} role={target.role}",
    )
    return {"ok": True}
