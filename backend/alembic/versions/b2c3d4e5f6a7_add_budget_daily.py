"""add budget_daily table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-06 00:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budget_daily",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("restaurant_code", sa.String(50), nullable=False),
        sa.Column("budget_date", sa.Date(), nullable=False),
        sa.Column("ca_target", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("restaurant_code", "budget_date", name="uq_budget_daily"),
    )
    op.create_index("ix_budget_daily_restaurant_code", "budget_daily", ["restaurant_code"])
    op.create_index("ix_budget_daily_budget_date", "budget_daily", ["budget_date"])


def downgrade() -> None:
    op.drop_index("ix_budget_daily_budget_date", "budget_daily")
    op.drop_index("ix_budget_daily_restaurant_code", "budget_daily")
    op.drop_table("budget_daily")
