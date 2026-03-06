"""add drive kpis

Revision ID: a1b2c3d4e5f6
Revises: f3a9c1d8e2b4
Create Date: 2026-03-06 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f3a9c1d8e2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    for column_name, col_type in (
        ("ca_drive", sa.Numeric(14, 6)),
        ("ca_drive_n1", sa.Numeric(14, 6)),
        ("client_drive", sa.Integer()),
        ("client_drive_n1", sa.Integer()),
    ):
        if column_name not in columns:
            op.add_column(
                "bk_daily_kpis",
                sa.Column(column_name, col_type, nullable=True),
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    for column_name in ("client_drive_n1", "client_drive", "ca_drive_n1", "ca_drive"):
        if column_name in columns:
            op.drop_column("bk_daily_kpis", column_name)
