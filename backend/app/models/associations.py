from sqlalchemy import Column, DateTime, ForeignKey, Table
from sqlalchemy.sql import func

from app.db.base import Base

user_restaurants = Table(
    "user_restaurants",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("restaurant_id", ForeignKey("restaurants.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)
