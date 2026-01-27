from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.auth_deps import get_current_user, require_roles
from app.core.roles import Role
from app.models.restaurant import Restaurant

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("/mine")
def my_restaurants(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role == Role.DEV.value:
        rows = db.query(Restaurant).order_by(Restaurant.code.asc()).all()
        return [{"id": r.id, "code": r.code, "name": r.name} for r in rows]

    return [{"id": r.id, "code": r.code, "name": r.name} for r in user.restaurants]


@router.get("")
def list_restaurants(
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.ADMIN, Role.DEV])),
):
    rows = db.query(Restaurant).order_by(Restaurant.code.asc()).all()
    return [{"id": r.id, "code": r.code, "name": r.name} for r in rows]
