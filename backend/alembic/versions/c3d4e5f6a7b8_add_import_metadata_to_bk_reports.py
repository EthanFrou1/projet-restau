"""add import metadata to bk reports

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-02-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "bk_daily_reports",
        sa.Column("imported_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bk_daily_reports",
        sa.Column(
            "is_reimport",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        op.f("ix_bk_daily_reports_imported_by_user_id"),
        "bk_daily_reports",
        ["imported_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_bk_daily_reports_imported_by_user_id_users",
        "bk_daily_reports",
        "users",
        ["imported_by_user_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_bk_daily_reports_imported_by_user_id_users",
        "bk_daily_reports",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_bk_daily_reports_imported_by_user_id"), table_name="bk_daily_reports")
    op.drop_column("bk_daily_reports", "is_reimport")
    op.drop_column("bk_daily_reports", "imported_by_user_id")
