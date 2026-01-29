"""add is_total to bk_channel_sales

Revision ID: 3f4c2a9b6d10
Revises: 7a8b1d2c9f01
Create Date: 2026-01-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3f4c2a9b6d10"
down_revision = "7a8b1d2c9f01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bk_channel_sales",
        sa.Column("is_total", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("bk_channel_sales", "is_total")
