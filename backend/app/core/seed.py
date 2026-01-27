import os
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.core.roles import Role
from app.core.security import hash_password

def seed_dev_user_if_needed() -> None:
    if os.getenv("ENV") != "dev":
        return

    dev_email = os.getenv("DEV_EMAIL", "dev@restau.com")
    dev_password = os.getenv("DEV_PASSWORD", "dev1234")

    db: Session = SessionLocal()
    try:
        # Si un user existe déjà, on ne seed pas (évite les surprises)
        existing = db.execute(select(User).limit(1)).scalar_one_or_none()
        if existing:
            return

        user = User(
            email=dev_email,
            hashed_password=hash_password(dev_password),
            is_active=True,
            role=Role.DEV.value,
        )
        db.add(user)
        db.commit()
        print(f"[SEED] DEV user created: {dev_email}")
    finally:
        db.close()
