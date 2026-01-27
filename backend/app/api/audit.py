from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.models.audit_log import AuditLog
from app.core.audit import write_audit_log

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/latest")
def latest(
    limit: int = 50,
    action: str | None = None,
    actor_email: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles([Role.ADMIN])),
):
    limit = min(max(limit, 1), 200)

    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    if actor_email:
        query = query.filter(AuditLog.actor_email == actor_email)

    rows = (
        query
        .order_by(AuditLog.id.desc())
        .limit(limit)
        .all()
    )

    write_audit_log(
        db,
        action="audit.read",
        actor_email=user.email,
        target=f"limit={limit}",
    )

    return [
        {
            "id": r.id,
            "action": r.action,
            "actor_email": r.actor_email,
            "target": r.target,
            "timestamp": r.timestamp,
        }
        for r in rows
    ]
