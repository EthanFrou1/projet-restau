from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BudgetDaily(Base):
    __tablename__ = "budget_daily"
    __table_args__ = (UniqueConstraint("restaurant_code", "budget_date", name="uq_budget_daily"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    restaurant_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    budget_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    ca_target: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
