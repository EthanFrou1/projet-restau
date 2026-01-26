from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import models so Alembic / metadata sees them
from app.models.user import User
from app.models.restaurant import Restaurant
from app.models.audit_log import AuditLog