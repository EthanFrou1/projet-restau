from fastapi import APIRouter, Depends
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.core.audit import write_audit_log
from app.api.deps import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/ping")
def admin_ping(user=Depends(require_roles([Role.ADMIN])),db: Session = Depends(get_db),):
    write_audit_log(db, "admin.ping.success", user.email, "route:/admin/ping")

    return {"ok": True, "scope": "admin"}
