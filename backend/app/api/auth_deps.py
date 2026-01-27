from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.jwt import decode_access_token
from app.core.roles import Role
from app.db.users import get_user_by_id
from app.core.audit import write_audit_log
from app.core.errors import auth_error

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("Missing sub")
        user_id = int(sub)
    except Exception:
        # Token invalide / expiré
        write_audit_log(
            db,
            action="auth.token.invalid",
            actor_email="unknown",
            target="token",
        )
        auth_error(
            "AUTH_INVALID_TOKEN",
            "Token invalide ou expiré",
        )

    user = get_user_by_id(db, user_id)
    if not user:
        write_audit_log(
            db,
            action="auth.user.not_found",
            actor_email="unknown",
            target=f"user_id:{user_id}",
        )
        auth_error(
            "AUTH_USER_NOT_FOUND",
            "Utilisateur non trouvé",
        )

    return user


def require_roles(allowed: list[Role]):
    def _guard(
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # DEV bypass
        if user.role == Role.DEV.value:
            return user

        allowed_values = [r.value for r in allowed]

        if user.role not in allowed_values:
            write_audit_log(
                db,
                action="auth.forbidden",
                actor_email=user.email,
                target=f"required_roles:{allowed_values}",
            )
            auth_error(
                "AUTH_FORBIDDEN",
                "Permissions insuffisantes",
                status_code=403,
            )

        return user

    return _guard
