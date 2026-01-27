from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def write_audit_log(db: Session, action: str, actor_email: str, target: str) -> None:
    try:
        log = AuditLog(
            action=action,
            actor_email=actor_email,
            target=target,
        )
        db.add(log)
        db.commit()
    except Exception:
        # On ne casse jamais la route si l'audit échoue
        db.rollback()
